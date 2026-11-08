-- Lamplighters: the first 100 beta testers. They apply, an admin accepts them,
-- and they get Premium free for 90 days in exchange for honest feedback.

alter table public.dss_subscribers add column if not exists beta_until timestamptz;

create table if not exists public.dss_lamplighters (
  email text primary key,
  why text,
  status text not null default 'applied' check (status in ('applied', 'accepted', 'declined')),
  timezone text,
  user_agent text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.dss_lamplighters enable row level security;
revoke all on public.dss_lamplighters from anon, authenticated;

insert into public.dss_config (key, value) values ('lamplighter_spots', '100') on conflict (key) do nothing;

-- One place that decides "gets Premium": a paid plan, Founders, or an active Lamplighter beta.
create or replace function public.dss_has_premium(s public.dss_subscribers) returns boolean
language sql stable set search_path = '' as $$
  select coalesce(s.premium_status in ('founder', 'monthly', 'yearly'), false)
      or coalesce(s.beta_until > now(), false);
$$;
revoke all on function public.dss_has_premium(public.dss_subscribers) from public, anon, authenticated;

-- Public: spots left (for the landing page counter).
create or replace function public.dss_lamplighter_stats()
returns json language plpgsql security definer set search_path = '' as $$
declare v_spots integer := coalesce((select value::integer from public.dss_config where key = 'lamplighter_spots'), 100);
        v_accepted integer := (select count(*) from public.dss_lamplighters where status = 'accepted');
begin
  return json_build_object('spots', v_spots, 'accepted', v_accepted, 'left', greatest(v_spots - v_accepted, 0),
                           'open', v_accepted < v_spots);
end;
$$;

-- Public: apply. Also adds them to the free daily study list.
create or replace function public.dss_lamplighter_apply(
  p_email text, p_why text, p_timezone text, p_user_agent text, p_consent text
) returns json language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_tz text := case when exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then p_timezone else null end;
  v_status text;
begin
  if v_email is null or length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  insert into public.dss_subscribers (email, plan_interest, source, consent_text, user_agent, timezone)
  values (v_email, 'premium', 'lamplighter', left(p_consent, 500), left(p_user_agent, 300), v_tz)
  on conflict (email) do update set
    timezone = coalesce(public.dss_subscribers.timezone, excluded.timezone),
    unsubscribed_at = null,
    updated_at = now();
  insert into public.dss_lamplighters (email, why, timezone, user_agent)
  values (v_email, left(p_why, 1000), v_tz, left(p_user_agent, 300))
  on conflict (email) do update set why = coalesce(excluded.why, public.dss_lamplighters.why)
    where public.dss_lamplighters.status = 'applied'
  returning status into v_status;
  if v_status is null then
    select status into v_status from public.dss_lamplighters where email = v_email;
  end if;
  return json_build_object('ok', true, 'status', v_status);
end;
$$;

create or replace function public.dss_lamplighter_list(p_gate text)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select l.email, l.why, l.status, l.timezone, l.created_at, l.decided_at, s.beta_until
      from public.dss_lamplighters l left join public.dss_subscribers s on s.email = l.email
      order by case l.status when 'applied' then 0 when 'accepted' then 1 else 2 end, l.created_at
    ) r
  ), '[]'::json);
end;
$$;

-- Accept (90 days of free Premium) or decline. Returns whether a spot was available.
create or replace function public.dss_lamplighter_decide(p_gate text, p_email text, p_accept boolean)
returns json language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(p_email));
begin
  perform public.dss_check_gate(p_gate);
  if p_accept and not (public.dss_lamplighter_stats()->>'open')::boolean then
    return json_build_object('ok', false, 'error', 'All Lamplighter spots are taken.');
  end if;
  update public.dss_lamplighters set status = case when p_accept then 'accepted' else 'declined' end, decided_at = now()
    where email = v_email and status = 'applied';
  if not found then return json_build_object('ok', false, 'error', 'No open application for that email.'); end if;
  if p_accept then
    update public.dss_subscribers set beta_until = now() + interval '90 days', updated_at = now() where email = v_email;
  end if;
  return json_build_object('ok', true);
end;
$$;

-- Active Lamplighters, for the weekly feedback email.
create or replace function public.dss_lamplighters_active(p_gate text)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select s.email, s.unsub_token, s.beta_until
      from public.dss_lamplighters l join public.dss_subscribers s on s.email = l.email
      where l.status = 'accepted' and s.beta_until > now() and public.dss_is_mailable(s)
    ) r
  ), '[]'::json);
end;
$$;

-- ---- Premium checks now include active Lamplighters ----

create or replace function public.dss_due_recipients(p_gate text, p_limit integer)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select x.email, x.unsub_token, x.premium, x.local_date as study_date,
             case when x.premium then (
               select json_build_object('reply', rf.reply, 'passage', rf.content->'passage',
                                        'body', rf.content->'body', 'voice', rf.content->'voice')
               from public.dss_reflections rf
               where rf.email = x.email and rf.for_date = x.local_date and rf.status = 'ready'
             ) end as yesterday
      from (
        select s.email, s.unsub_token, s.created_at,
               public.dss_has_premium(s) as premium,
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

create or replace function public.dss_due_checkins(p_gate text, p_limit integer)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select x.email, x.unsub_token, x.local_date
      from (
        select s.email, s.unsub_token,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles')) as local_now,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles'))::date as local_date
        from public.dss_subscribers s
        where public.dss_is_mailable(s) and public.dss_has_premium(s)
      ) x
      where extract(hour from x.local_now) between 20 and 22
        and not exists (select 1 from public.dss_checkins c where c.email = x.email and c.local_date = x.local_date)
        and not exists (select 1 from public.dss_reflections rf where rf.email = x.email and rf.for_date = x.local_date + 1)
      order by x.email
      limit greatest(1, least(p_limit, 100))
    ) r
  ), '[]'::json);
end;
$$;

create or replace function public.dss_reader_lookup(p_gate text, p_email text)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return (
    select json_build_object(
      'premium', public.dss_has_premium(s),
      'timezone', coalesce(s.timezone, 'America/Los_Angeles'),
      'mailable', public.dss_is_mailable(s),
      'next_date', case
        when extract(hour from now() at time zone coalesce(s.timezone, 'America/Los_Angeles')) < 5
          then (now() at time zone coalesce(s.timezone, 'America/Los_Angeles'))::date
        else (now() at time zone coalesce(s.timezone, 'America/Los_Angeles'))::date + 1 end
    )
    from public.dss_subscribers s where s.email = lower(trim(p_email))
  );
end;
$$;

create or replace function public.dss_welcome_pending(p_gate text, p_limit integer)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select s.email, s.unsub_token, public.dss_has_premium(s) as premium
      from public.dss_subscribers s
      where public.dss_is_mailable(s) and s.welcomed_at is null
      order by s.created_at limit greatest(1, least(p_limit, 100))
    ) r
  ), '[]'::json);
end;
$$;

revoke all on function public.dss_lamplighter_stats() from public;
grant execute on function public.dss_lamplighter_stats() to anon, authenticated, service_role;
revoke all on function public.dss_lamplighter_apply(text, text, text, text, text) from public;
grant execute on function public.dss_lamplighter_apply(text, text, text, text, text) to anon, authenticated, service_role;
revoke all on function public.dss_lamplighter_list(text) from public;
grant execute on function public.dss_lamplighter_list(text) to anon, authenticated, service_role;
revoke all on function public.dss_lamplighter_decide(text, text, boolean) from public;
grant execute on function public.dss_lamplighter_decide(text, text, boolean) to anon, authenticated, service_role;
revoke all on function public.dss_lamplighters_active(text) from public;
grant execute on function public.dss_lamplighters_active(text) to anon, authenticated, service_role;
