-- Founders lifetime offer ($37 for the first 250, then $67, capped at 1,000) and partner commissions.
-- Writes come only from the Stripe webhook through gated SECURITY DEFINER functions.

create table if not exists public.dss_config (
  key text primary key,
  value text not null
);
alter table public.dss_config enable row level security;
revoke all on public.dss_config from anon, authenticated;
grant select, insert, update, delete on public.dss_config to service_role;

create table if not exists public.dss_founders (
  id uuid primary key default gen_random_uuid(),
  founder_number integer not null unique,
  email text not null,
  amount_cents integer not null check (amount_cents > 0),
  tier smallint not null check (tier in (1, 2)),
  referred_by text,
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dss_founders_email_idx on public.dss_founders (email);
alter table public.dss_founders enable row level security;
revoke all on public.dss_founders from anon, authenticated;
grant select, insert, update, delete on public.dss_founders to service_role;

create table if not exists public.dss_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_code text not null,
  source text not null check (source in ('founder', 'subscription')),
  source_ref text not null unique,           -- Stripe checkout session or invoice id
  buyer_email text,
  sale_cents integer not null,
  commission_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'earned', 'paid', 'void')),
  earn_after timestamptz not null,           -- net 30: pending until this time
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dss_commissions_partner_idx on public.dss_commissions (partner_code, status);
alter table public.dss_commissions enable row level security;
revoke all on public.dss_commissions from anon, authenticated;
grant select, insert, update, delete on public.dss_commissions to service_role;

alter table public.dss_subscribers
  add column if not exists premium_status text check (premium_status is null or premium_status in ('founder', 'monthly', 'canceled'));

-- Public: how many Founders spots are taken (numbers only).
create or replace function public.dss_founders_stats()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'sold', (select count(*) from public.dss_founders where status = 'paid'),
    'tier1_limit', 250,
    'cap', 1000
  );
$$;
revoke all on function public.dss_founders_stats() from public;
grant execute on function public.dss_founders_stats() to anon, authenticated, service_role;

-- Webhook only (gate secret): record a paid Founders checkout, its commission, and Premium status.
create or replace function public.dss_record_founder(
  p_gate text,
  p_session_id text,
  p_payment_intent text,
  p_email text,
  p_amount_cents integer,
  p_tier smallint,
  p_ref text
) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_num integer;
  v_email text := lower(trim(p_email));
  v_ref text := nullif(lower(trim(coalesce(p_ref, ''))), '');
  v_existing integer;
begin
  if p_gate is null or p_gate <> (select value from public.dss_config where key = 'gate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select founder_number into v_existing from public.dss_founders where stripe_session_id = p_session_id;
  if v_existing is not null then
    return json_build_object('founder_number', v_existing, 'duplicate', true);
  end if;

  perform pg_advisory_xact_lock(hashtext('dss_founders'));
  select coalesce(max(founder_number), 0) + 1 into v_num from public.dss_founders;

  -- Referral: checkout ref wins, else the ref saved when they first signed up.
  if v_ref is null or v_ref !~ '^[a-z0-9_-]{2,40}$' then
    select referred_by into v_ref from public.dss_subscribers where email = v_email;
  end if;

  insert into public.dss_founders (founder_number, email, amount_cents, tier, referred_by, stripe_session_id, stripe_payment_intent)
  values (v_num, v_email, p_amount_cents, p_tier, v_ref, p_session_id, p_payment_intent);

  insert into public.dss_subscribers (email, plan_interest, source, premium_status)
  values (v_email, 'premium', 'founders-checkout', 'founder')
  on conflict (email) do update set plan_interest = 'premium', premium_status = 'founder';

  if v_ref is not null then
    insert into public.dss_commissions (partner_code, source, source_ref, buyer_email, sale_cents, commission_cents, earn_after)
    values (v_ref, 'founder', p_session_id, v_email, p_amount_cents, round(p_amount_cents * 0.30), now() + interval '30 days')
    on conflict (source_ref) do nothing;
  end if;

  return json_build_object('founder_number', v_num, 'duplicate', false);
end;
$$;
revoke all on function public.dss_record_founder(text, text, text, text, integer, smallint, text) from public;
grant execute on function public.dss_record_founder(text, text, text, text, integer, smallint, text) to anon, authenticated, service_role;

-- Webhook only: a Founders payment was refunded. Void unpaid commission; keep paid ones for clawback.
create or replace function public.dss_refund_founder(p_gate text, p_payment_intent text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_session text; v_email text;
begin
  if p_gate is null or p_gate <> (select value from public.dss_config where key = 'gate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.dss_founders set status = 'refunded', updated_at = now()
    where stripe_payment_intent = p_payment_intent
    returning stripe_session_id, email into v_session, v_email;
  if v_session is null then return; end if;
  update public.dss_commissions set status = 'void', updated_at = now()
    where source_ref = v_session and status in ('pending', 'earned');
  update public.dss_subscribers set premium_status = 'canceled' where email = v_email and premium_status = 'founder';
end;
$$;
revoke all on function public.dss_refund_founder(text, text) from public;
grant execute on function public.dss_refund_founder(text, text) to anon, authenticated, service_role;
