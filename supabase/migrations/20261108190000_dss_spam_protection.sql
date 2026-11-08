-- Spam protection: confirm-your-email (double opt-in) and durable rate limits.

-- ---------- Double opt-in ----------
alter table public.dss_subscribers
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirm_token uuid not null default gen_random_uuid(),
  add column if not exists confirm_sent_at timestamptz;
create unique index if not exists dss_subscribers_confirm_token on public.dss_subscribers (confirm_token);

-- Paying members proved their email at checkout: confirm them automatically.
create or replace function public.dss_auto_confirm_paid() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.premium_status in ('founder', 'monthly', 'yearly') and new.confirmed_at is null then
    new.confirmed_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists dss_auto_confirm_paid on public.dss_subscribers;
create trigger dss_auto_confirm_paid before insert or update on public.dss_subscribers
  for each row execute function public.dss_auto_confirm_paid();
update public.dss_subscribers set confirmed_at = now()
  where confirmed_at is null and premium_status in ('founder', 'monthly', 'yearly');

-- Nobody gets study, check-in, or welcome emails until they confirm.
create or replace function public.dss_is_mailable(s public.dss_subscribers) returns boolean
language sql immutable set search_path = '' as $$
  select s.unsubscribed_at is null and not s.suspected_bot and s.confirmed_at is not null;
$$;

-- Sign-up: same as before, except signing up again after unsubscribing needs a fresh confirmation,
-- so nobody can re-subscribe someone else's address.
drop function if exists public.dss_subscribe(text, text, text, text, boolean, text, text, text, text);
create or replace function public.dss_subscribe(
  p_email text,
  p_plan text default 'free',
  p_source text default null,
  p_ref text default null,
  p_suspected_bot boolean default false,
  p_consent text default null,
  p_user_agent text default null,
  p_email_flag text default null,
  p_timezone text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_ref text := lower(trim(coalesce(p_ref, '')));
  v_flag text := case when p_email_flag = 'privacy_relay' then 'privacy_relay' else null end;
  v_tz text := case when exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then p_timezone else null end;
begin
  if v_email is null or length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if v_ref !~ '^[a-z0-9_-]{2,40}$' then
    v_ref := null;
  end if;

  insert into public.dss_subscribers (email, plan_interest, source, referred_by, suspected_bot, consent_text, user_agent, email_flag, timezone)
  values (
    v_email,
    case when p_plan = 'premium' then 'premium' else 'free' end,
    left(p_source, 40),
    v_ref,
    coalesce(p_suspected_bot, false),
    left(p_consent, 500),
    left(p_user_agent, 300),
    v_flag,
    v_tz
  )
  on conflict (email) do update set
    plan_interest = excluded.plan_interest,
    source = coalesce(excluded.source, public.dss_subscribers.source),
    referred_by = coalesce(public.dss_subscribers.referred_by, excluded.referred_by),
    suspected_bot = public.dss_subscribers.suspected_bot or excluded.suspected_bot,
    consent_text = excluded.consent_text,
    user_agent = excluded.user_agent,
    email_flag = excluded.email_flag,
    timezone = coalesce(excluded.timezone, public.dss_subscribers.timezone),
    confirmed_at = case when public.dss_subscribers.unsubscribed_at is not null
                          and coalesce(public.dss_subscribers.premium_status, '') not in ('founder', 'monthly', 'yearly')
                        then null else public.dss_subscribers.confirmed_at end,
    unsubscribed_at = null,
    updated_at = now();
end;
$$;
revoke all on function public.dss_subscribe(text, text, text, text, boolean, text, text, text, text) from public;
grant execute on function public.dss_subscribe(text, text, text, text, boolean, text, text, text, text) to anon, authenticated, service_role;

-- What the app needs to send a confirmation email (never sends to bots or the already confirmed).
create or replace function public.dss_confirm_prepare(p_gate text, p_email text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(p_email)); s public.dss_subscribers;
begin
  perform public.dss_check_gate(p_gate);
  select * into s from public.dss_subscribers where email = v_email;
  if s.id is null or s.suspected_bot or s.confirmed_at is not null then
    return json_build_object('send', false);
  end if;
  -- At most one confirmation email per address every 10 minutes (stops list-bombing a victim).
  if s.confirm_sent_at is not null and s.confirm_sent_at > now() - interval '10 minutes' then
    return json_build_object('send', false);
  end if;
  update public.dss_subscribers set confirm_sent_at = now() where email = v_email;
  return json_build_object('send', true, 'token', s.confirm_token);
end;
$$;

-- Public: the confirm link. The token is the secret.
create or replace function public.dss_confirm(p_token uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  update public.dss_subscribers set confirmed_at = coalesce(confirmed_at, now()), updated_at = now()
    where confirm_token = p_token and not suspected_bot
    returning email into v_email;
  if v_email is null then return json_build_object('ok', false); end if;
  return json_build_object('ok', true, 'email', v_email);
end;
$$;

-- ---------- Durable rate limits (survive across server instances) ----------
create table if not exists public.dss_rate (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table public.dss_rate enable row level security;
revoke all on public.dss_rate from anon, authenticated;

-- Counts one hit for p_key in the current window; returns true if still under p_max.
create or replace function public.dss_rate_hit(p_gate text, p_key text, p_window_seconds integer, p_max integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_rate (key, window_start, hits) values (left(p_key, 200), v_window, 1)
  on conflict (key, window_start) do update set hits = public.dss_rate.hits + 1
  returning hits into v_hits;
  -- Housekeeping: drop windows older than a day.
  if random() < 0.02 then delete from public.dss_rate where window_start < now() - interval '1 day'; end if;
  return v_hits <= p_max;
end;
$$;

-- Admin edit: allow marking someone confirmed (or not).
create or replace function public.dss_admin_set_confirmed(p_gate text, p_email text, p_confirmed boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  update public.dss_subscribers
    set confirmed_at = case when p_confirmed then coalesce(confirmed_at, now()) else null end, updated_at = now()
    where email = lower(trim(p_email));
end;
$$;

revoke all on function public.dss_confirm_prepare(text, text) from public;
grant execute on function public.dss_confirm_prepare(text, text) to anon, authenticated, service_role;
revoke all on function public.dss_confirm(uuid) from public;
grant execute on function public.dss_confirm(uuid) to anon, authenticated, service_role;
revoke all on function public.dss_rate_hit(text, text, integer, integer) from public;
grant execute on function public.dss_rate_hit(text, text, integer, integer) to anon, authenticated, service_role;
revoke all on function public.dss_admin_set_confirmed(text, text, boolean) from public;
grant execute on function public.dss_admin_set_confirmed(text, text, boolean) to anon, authenticated, service_role;
