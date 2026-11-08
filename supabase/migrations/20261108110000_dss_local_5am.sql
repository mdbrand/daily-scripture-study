-- Send each reader's study at 5 AM in their own time zone.

alter table public.dss_subscribers add column if not exists timezone text;

-- Sign-up now records the browser's time zone, and signing up again after unsubscribing resubscribes.
drop function if exists public.dss_subscribe(text, text, text, text, boolean, text, text, text);
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
    suspected_bot = excluded.suspected_bot,
    consent_text = excluded.consent_text,
    user_agent = excluded.user_agent,
    email_flag = excluded.email_flag,
    timezone = coalesce(excluded.timezone, public.dss_subscribers.timezone),
    unsubscribed_at = null,
    updated_at = now();
end;
$$;
revoke all on function public.dss_subscribe(text, text, text, text, boolean, text, text, text, text) from public;
grant execute on function public.dss_subscribe(text, text, text, text, boolean, text, text, text, text) to anon, authenticated, service_role;

-- People whose local time is 5:00–7:59 AM (catch-up room if an hourly run is missed),
-- who joined before 5 AM their time today, and who haven't had today's study yet.
-- Readers without a saved time zone use Pacific time.
create or replace function public.dss_due_recipients(p_gate text, p_limit integer)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select x.email, x.unsub_token, x.premium, x.local_date as study_date
      from (
        select s.email, s.unsub_token, s.created_at,
               coalesce(s.premium_status in ('founder', 'monthly', 'yearly'), false) as premium,
               coalesce(s.timezone, 'America/Los_Angeles') as tz,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles')) as local_now,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles'))::date as local_date
        from public.dss_subscribers s
        where public.dss_is_mailable(s)
      ) x
      join public.dss_studies st on st.study_date = x.local_date and st.status = 'approved'
      where extract(hour from x.local_now) between 5 and 7
        and x.created_at < ((x.local_date + time '05:00') at time zone x.tz)
        and not exists (select 1 from public.dss_sends d where d.study_date = x.local_date and d.email = x.email)
      order by x.local_date, x.created_at
      limit greatest(1, least(p_limit, 100))
    ) r
  ), '[]'::json);
end;
$$;
revoke all on function public.dss_due_recipients(text, integer) from public;
grant execute on function public.dss_due_recipients(text, integer) to anon, authenticated, service_role;

-- A study now goes out across many hours, so it stays 'approved' (holdable) and just counts sends.
create or replace function public.dss_record_sends(p_gate text, p_date date, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_sends (study_date, email, resend_id)
  select p_date, r->>'email', r->>'resend_id' from jsonb_array_elements(p_rows) r
  on conflict do nothing;
  get diagnostics n = row_count;
  update public.dss_studies
    set sent_count = (select count(*) from public.dss_sends where study_date = p_date),
        sent_at = coalesce(sent_at, now())
    where study_date = p_date;
  return n;
end;
$$;

-- Once anyone has received a study, it can't be rewritten.
create or replace function public.dss_study_upsert(p_gate text, p_date date, p_content jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_studies (study_date, content) values (p_date, p_content)
  on conflict (study_date) do update set content = excluded.content, updated_at = now()
    where public.dss_studies.sent_count = 0;
end;
$$;
