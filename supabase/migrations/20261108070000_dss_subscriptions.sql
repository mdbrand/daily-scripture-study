-- Premium subscriptions ($7/month, $47/year) and recurring 30% partner commissions.
-- Writes only through gated SECURITY DEFINER functions called by the Stripe webhook.

insert into public.dss_config (key, value) values ('premium_checkout_open', 'false')
on conflict (key) do nothing;

alter table public.dss_subscribers drop constraint if exists dss_subscribers_premium_status_check;
alter table public.dss_subscribers
  add constraint dss_subscribers_premium_status_check
  check (premium_status is null or premium_status in ('founder', 'monthly', 'yearly', 'past_due', 'canceled'));

alter table public.dss_commissions add column if not exists payment_ref text;
create index if not exists dss_commissions_payment_ref_idx on public.dss_commissions (payment_ref) where payment_ref is not null;

create table if not exists public.dss_subscriptions (
  id uuid primary key default gen_random_uuid(),
  stripe_subscription_id text not null unique,
  stripe_customer_id text,
  email text not null,
  plan text not null check (plan in ('monthly', 'yearly')),
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  referred_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dss_subscriptions_email_idx on public.dss_subscriptions (email);
alter table public.dss_subscriptions enable row level security;
revoke all on public.dss_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.dss_subscriptions to service_role;

-- Public: is Premium checkout open?
create or replace function public.dss_premium_settings()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'checkout_open', coalesce((select value = 'true' from public.dss_config where key = 'premium_checkout_open'), false)
  );
$$;
revoke all on function public.dss_premium_settings() from public;
grant execute on function public.dss_premium_settings() to anon, authenticated, service_role;

-- Webhook: create/update a subscription and the subscriber's Premium status.
create or replace function public.dss_upsert_subscription(
  p_gate text,
  p_subscription_id text,
  p_customer_id text,
  p_email text,
  p_plan text,
  p_status text,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_ref text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_ref text := nullif(lower(trim(coalesce(p_ref, ''))), '');
  v_premium text;
begin
  if p_gate is null or p_gate <> (select value from public.dss_config where key = 'gate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_ref is not null and v_ref !~ '^[a-z0-9_-]{2,40}$' then v_ref := null; end if;
  if v_ref is null then
    select referred_by into v_ref from public.dss_subscribers where email = v_email;
  end if;

  insert into public.dss_subscriptions (stripe_subscription_id, stripe_customer_id, email, plan, status, current_period_end, cancel_at_period_end, referred_by)
  values (p_subscription_id, p_customer_id, v_email, p_plan, p_status, p_period_end, coalesce(p_cancel_at_period_end, false), v_ref)
  on conflict (stripe_subscription_id) do update set
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.dss_subscriptions.stripe_customer_id),
    plan = excluded.plan,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    referred_by = coalesce(public.dss_subscriptions.referred_by, excluded.referred_by),
    updated_at = now();

  v_premium := case
    when p_status in ('active', 'trialing') then p_plan
    when p_status in ('past_due', 'unpaid') then 'past_due'
    else 'canceled'
  end;

  insert into public.dss_subscribers (email, plan_interest, source, premium_status)
  values (v_email, 'premium', 'premium-checkout', v_premium)
  on conflict (email) do update set
    plan_interest = 'premium',
    -- never downgrade a lifetime Founder because of a separate subscription
    premium_status = case when public.dss_subscribers.premium_status = 'founder' then 'founder' else v_premium end;
end;
$$;
revoke all on function public.dss_upsert_subscription(text, text, text, text, text, text, timestamptz, boolean, text) from public;
grant execute on function public.dss_upsert_subscription(text, text, text, text, text, text, timestamptz, boolean, text) to anon, authenticated, service_role;

-- Webhook: a subscription invoice was paid -> 30% commission, pending 30 days (net 30).
create or replace function public.dss_record_subscription_payment(
  p_gate text,
  p_invoice_id text,
  p_subscription_id text,
  p_amount_cents integer,
  p_payment_ref text
) returns json
language plpgsql security definer set search_path = '' as $$
declare v_ref text; v_email text;
begin
  if p_gate is null or p_gate <> (select value from public.dss_config where key = 'gate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select referred_by, email into v_ref, v_email from public.dss_subscriptions where stripe_subscription_id = p_subscription_id;
  if v_ref is null or coalesce(p_amount_cents, 0) <= 0 then
    return json_build_object('commission', false);
  end if;
  insert into public.dss_commissions (partner_code, source, source_ref, buyer_email, sale_cents, commission_cents, earn_after, payment_ref)
  values (v_ref, 'subscription', p_invoice_id, v_email, p_amount_cents, round(p_amount_cents * 0.30), now() + interval '30 days', p_payment_ref)
  on conflict (source_ref) do nothing;
  return json_build_object('commission', true, 'partner', v_ref);
end;
$$;
revoke all on function public.dss_record_subscription_payment(text, text, text, integer, text) from public;
grant execute on function public.dss_record_subscription_payment(text, text, text, integer, text) to anon, authenticated, service_role;

-- Webhook: a payment was refunded -> void its unpaid subscription commission.
create or replace function public.dss_void_payment_commission(p_gate text, p_payment_ref text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_gate is null or p_gate <> (select value from public.dss_config where key = 'gate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.dss_commissions set status = 'void', updated_at = now()
    where payment_ref = p_payment_ref and source = 'subscription' and status in ('pending', 'earned');
end;
$$;
revoke all on function public.dss_void_payment_commission(text, text) from public;
grant execute on function public.dss_void_payment_commission(text, text) to anon, authenticated, service_role;
