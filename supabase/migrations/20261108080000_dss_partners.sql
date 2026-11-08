-- Partner program: real partner codes, sign-in tokens, click counts, maturing commissions, payouts.
-- Every read/write goes through gated SECURITY DEFINER functions (p_gate = dss_config.gate),
-- except dss_partner_click (public, counts only).

create table if not exists public.dss_partners (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{2,23}$'),
  email text not null unique,
  status text not null default 'active' check (status in ('active', 'paused', 'removed')),
  stripe_account_id text,
  payouts_enabled boolean not null default false,
  terms_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dss_partners enable row level security;
revoke all on public.dss_partners from anon, authenticated;
grant select, insert, update, delete on public.dss_partners to service_role;

create table if not exists public.dss_partner_clicks (
  code text not null,
  day date not null default current_date,
  clicks integer not null default 0,
  primary key (code, day)
);
alter table public.dss_partner_clicks enable row level security;
revoke all on public.dss_partner_clicks from anon, authenticated;
grant select, insert, update, delete on public.dss_partner_clicks to service_role;

create table if not exists public.dss_login_tokens (
  token_hash text primary key,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.dss_login_tokens enable row level security;
revoke all on public.dss_login_tokens from anon, authenticated;
grant select, insert, update, delete on public.dss_login_tokens to service_role;

create table if not exists public.dss_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_code text not null,
  amount_cents integer not null,
  commission_ids uuid[] not null,
  stripe_transfer_id text,
  status text not null check (status in ('paid', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
alter table public.dss_payouts enable row level security;
revoke all on public.dss_payouts from anon, authenticated;
grant select, insert, update, delete on public.dss_payouts to service_role;

-- ---------- helpers ----------
create or replace function public.dss_check_gate(p_gate text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_gate is null or p_gate <> (select value from public.dss_config where key = 'gate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.dss_check_gate(text) from public;

-- A partner may earn only if active and still an active Premium member.
create or replace function public.dss_partner_can_earn(p_code text, p_buyer_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dss_partners p
    join public.dss_subscribers s on s.email = p.email
    where p.code = p_code
      and p.status = 'active'
      and s.premium_status in ('founder', 'monthly', 'yearly')
      and p.email <> lower(coalesce(p_buyer_email, ''))
  );
$$;
revoke all on function public.dss_partner_can_earn(text, text) from public;

-- ---------- public: count a link click ----------
create or replace function public.dss_partner_click(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_code text := lower(trim(coalesce(p_code, '')));
begin
  if not exists (select 1 from public.dss_partners where code = v_code and status = 'active') then return; end if;
  insert into public.dss_partner_clicks (code, day, clicks) values (v_code, current_date, 1)
  on conflict (code, day) do update set clicks = public.dss_partner_clicks.clicks + 1;
end;
$$;
revoke all on function public.dss_partner_click(text) from public;
grant execute on function public.dss_partner_click(text) to anon, authenticated, service_role;

-- ---------- sign-in tokens ----------
create or replace function public.dss_create_login_token(p_gate text, p_email text, p_token_hash text, p_ttl_minutes integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  delete from public.dss_login_tokens where expires_at < now() - interval '1 day';
  insert into public.dss_login_tokens (token_hash, email, expires_at)
  values (p_token_hash, lower(trim(p_email)), now() + make_interval(mins => p_ttl_minutes));
end;
$$;
revoke all on function public.dss_create_login_token(text, text, text, integer) from public;
grant execute on function public.dss_create_login_token(text, text, text, integer) to anon, authenticated, service_role;

create or replace function public.dss_consume_login_token(p_gate text, p_token_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  perform public.dss_check_gate(p_gate);
  update public.dss_login_tokens set used_at = now()
    where token_hash = p_token_hash and used_at is null and expires_at > now()
    returning email into v_email;
  return v_email;
end;
$$;
revoke all on function public.dss_consume_login_token(text, text) from public;
grant execute on function public.dss_consume_login_token(text, text) to anon, authenticated, service_role;

-- ---------- partner join + profile ----------
create or replace function public.dss_create_partner(p_gate text, p_email text, p_code text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_code text := lower(trim(p_code));
  v_status text;
begin
  perform public.dss_check_gate(p_gate);
  select premium_status into v_status from public.dss_subscribers where email = v_email;
  if v_status is null or v_status not in ('founder', 'monthly', 'yearly') then
    return json_build_object('ok', false, 'error', 'Partners need an active Premium membership.');
  end if;
  if exists (select 1 from public.dss_partners where email = v_email) then
    return json_build_object('ok', false, 'error', 'You’re already a partner.');
  end if;
  if v_code !~ '^[a-z0-9][a-z0-9-]{2,23}$' then
    return json_build_object('ok', false, 'error', 'Use 3–24 letters, numbers, or dashes.');
  end if;
  if v_code in ('admin', 'morninglamp', 'morning-lamp', 'premium', 'founders', 'partners', 'support', 'hello', 'study', 'test') then
    return json_build_object('ok', false, 'error', 'That link name is reserved. Try another.');
  end if;
  if exists (select 1 from public.dss_partners where code = v_code) then
    return json_build_object('ok', false, 'error', 'That link name is taken. Try another.');
  end if;
  insert into public.dss_partners (code, email) values (v_code, v_email);
  return json_build_object('ok', true, 'code', v_code);
end;
$$;
revoke all on function public.dss_create_partner(text, text, text) from public;
grant execute on function public.dss_create_partner(text, text, text) to anon, authenticated, service_role;

create or replace function public.dss_partner_profile(p_gate text, p_email text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_p public.dss_partners;
  v_premium text;
begin
  perform public.dss_check_gate(p_gate);
  select premium_status into v_premium from public.dss_subscribers where email = v_email;
  select * into v_p from public.dss_partners where email = v_email;
  if v_p.id is null then
    return json_build_object('email', v_email, 'premium_status', v_premium, 'partner', null);
  end if;
  return json_build_object(
    'email', v_email,
    'premium_status', v_premium,
    'partner', json_build_object(
      'code', v_p.code, 'status', v_p.status,
      'stripe_account_id', v_p.stripe_account_id, 'payouts_enabled', v_p.payouts_enabled,
      'joined', v_p.created_at
    ),
    'stats', json_build_object(
      'clicks', coalesce((select sum(clicks) from public.dss_partner_clicks where code = v_p.code), 0),
      'signups', (select count(*) from public.dss_subscribers where referred_by = v_p.code and email <> v_email),
      'paying', (select count(*) from public.dss_subscriptions where referred_by = v_p.code and status in ('active', 'trialing') and email <> v_email)
               + (select count(*) from public.dss_founders where referred_by = v_p.code and status = 'paid' and email <> v_email),
      'pending_cents', coalesce((select sum(commission_cents) from public.dss_commissions where partner_code = v_p.code and status = 'pending'), 0),
      'earned_cents', coalesce((select sum(commission_cents) from public.dss_commissions where partner_code = v_p.code and status = 'earned'), 0),
      'paid_cents', coalesce((select sum(commission_cents) from public.dss_commissions where partner_code = v_p.code and status = 'paid'), 0)
    ),
    'recent', coalesce((
      select json_agg(r) from (
        select created_at, source, commission_cents, status, earn_after
        from public.dss_commissions where partner_code = v_p.code
        order by created_at desc limit 12
      ) r
    ), '[]'::json)
  );
end;
$$;
revoke all on function public.dss_partner_profile(text, text) from public;
grant execute on function public.dss_partner_profile(text, text) to anon, authenticated, service_role;

create or replace function public.dss_set_partner_stripe(p_gate text, p_code text, p_account_id text, p_payouts_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  update public.dss_partners
    set stripe_account_id = coalesce(p_account_id, stripe_account_id),
        payouts_enabled = coalesce(p_payouts_enabled, payouts_enabled),
        updated_at = now()
    where code = p_code;
end;
$$;
revoke all on function public.dss_set_partner_stripe(text, text, text, boolean) from public;
grant execute on function public.dss_set_partner_stripe(text, text, text, boolean) to anon, authenticated, service_role;

-- ---------- daily / monthly jobs ----------
create or replace function public.dss_mature_commissions(p_gate text)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform public.dss_check_gate(p_gate);
  update public.dss_commissions set status = 'earned', updated_at = now()
    where status = 'pending' and earn_after <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.dss_mature_commissions(text) from public;
grant execute on function public.dss_mature_commissions(text) to anon, authenticated, service_role;

create or replace function public.dss_payout_batch(p_gate text, p_min_cents integer)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(b) from (
      select p.code, p.email, p.stripe_account_id,
             sum(c.commission_cents)::integer as amount_cents,
             array_agg(c.id) as commission_ids
      from public.dss_partners p
      join public.dss_commissions c on c.partner_code = p.code and c.status = 'earned'
      where p.status = 'active' and p.payouts_enabled and p.stripe_account_id is not null
      group by p.code, p.email, p.stripe_account_id
      having sum(c.commission_cents) >= p_min_cents
    ) b
  ), '[]'::json);
end;
$$;
revoke all on function public.dss_payout_batch(text, integer) from public;
grant execute on function public.dss_payout_batch(text, integer) to anon, authenticated, service_role;

create or replace function public.dss_record_payout(
  p_gate text, p_code text, p_commission_ids uuid[], p_amount_cents integer, p_transfer_id text, p_error text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_payouts (partner_code, amount_cents, commission_ids, stripe_transfer_id, status, error)
  values (p_code, p_amount_cents, p_commission_ids, p_transfer_id, case when p_transfer_id is null then 'failed' else 'paid' end, p_error);
  if p_transfer_id is not null then
    update public.dss_commissions set status = 'paid', updated_at = now()
      where id = any(p_commission_ids) and status = 'earned';
  end if;
end;
$$;
revoke all on function public.dss_record_payout(text, text, uuid[], integer, text, text) from public;
grant execute on function public.dss_record_payout(text, text, uuid[], integer, text, text) to anon, authenticated, service_role;

create or replace function public.dss_partner_list(p_gate text)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r order by r.earned_cents + r.pending_cents desc) from (
      select p.code, p.email, p.status, p.payouts_enabled, p.created_at,
        coalesce((select sum(clicks) from public.dss_partner_clicks k where k.code = p.code), 0) as clicks,
        (select count(*) from public.dss_subscribers s where s.referred_by = p.code and s.email <> p.email) as signups,
        coalesce((select sum(commission_cents) from public.dss_commissions c where c.partner_code = p.code and c.status = 'pending'), 0) as pending_cents,
        coalesce((select sum(commission_cents) from public.dss_commissions c where c.partner_code = p.code and c.status = 'earned'), 0) as earned_cents,
        coalesce((select sum(commission_cents) from public.dss_commissions c where c.partner_code = p.code and c.status = 'paid'), 0) as paid_cents
      from public.dss_partners p
    ) r
  ), '[]'::json);
end;
$$;
revoke all on function public.dss_partner_list(text) from public;
grant execute on function public.dss_partner_list(text) to anon, authenticated, service_role;

-- ---------- commissions only for real, eligible partners; never self-referrals ----------
create or replace function public.dss_record_subscription_payment(
  p_gate text, p_invoice_id text, p_subscription_id text, p_amount_cents integer, p_payment_ref text
) returns json language plpgsql security definer set search_path = '' as $$
declare v_ref text; v_email text;
begin
  perform public.dss_check_gate(p_gate);
  select referred_by, email into v_ref, v_email from public.dss_subscriptions where stripe_subscription_id = p_subscription_id;
  if v_ref is null or coalesce(p_amount_cents, 0) <= 0 or not public.dss_partner_can_earn(v_ref, v_email) then
    return json_build_object('commission', false);
  end if;
  insert into public.dss_commissions (partner_code, source, source_ref, buyer_email, sale_cents, commission_cents, earn_after, payment_ref)
  values (v_ref, 'subscription', p_invoice_id, v_email, p_amount_cents, round(p_amount_cents * 0.30), now() + interval '30 days', p_payment_ref)
  on conflict (source_ref) do nothing;
  return json_build_object('commission', true, 'partner', v_ref);
end;
$$;

create or replace function public.dss_record_founder(
  p_gate text, p_session_id text, p_payment_intent text, p_email text, p_amount_cents integer, p_tier smallint, p_ref text
) returns json language plpgsql security definer set search_path = '' as $$
declare
  v_num integer;
  v_email text := lower(trim(p_email));
  v_ref text := nullif(lower(trim(coalesce(p_ref, ''))), '');
  v_existing integer;
begin
  perform public.dss_check_gate(p_gate);
  select founder_number into v_existing from public.dss_founders where stripe_session_id = p_session_id;
  if v_existing is not null then
    return json_build_object('founder_number', v_existing, 'duplicate', true);
  end if;

  perform pg_advisory_xact_lock(hashtext('dss_founders'));
  select coalesce(max(founder_number), 0) + 1 into v_num from public.dss_founders;

  if v_ref is null or v_ref !~ '^[a-z0-9_-]{2,40}$' then
    select referred_by into v_ref from public.dss_subscribers where email = v_email;
  end if;

  insert into public.dss_founders (founder_number, email, amount_cents, tier, referred_by, stripe_session_id, stripe_payment_intent)
  values (v_num, v_email, p_amount_cents, p_tier, v_ref, p_session_id, p_payment_intent);

  insert into public.dss_subscribers (email, plan_interest, source, premium_status)
  values (v_email, 'premium', 'founders-checkout', 'founder')
  on conflict (email) do update set plan_interest = 'premium', premium_status = 'founder';

  if v_ref is not null and public.dss_partner_can_earn(v_ref, v_email) then
    insert into public.dss_commissions (partner_code, source, source_ref, buyer_email, sale_cents, commission_cents, earn_after, payment_ref)
    values (v_ref, 'founder', p_session_id, v_email, p_amount_cents, round(p_amount_cents * 0.30), now() + interval '30 days', p_payment_intent)
    on conflict (source_ref) do nothing;
  end if;

  return json_build_object('founder_number', v_num, 'duplicate', false);
end;
$$;
