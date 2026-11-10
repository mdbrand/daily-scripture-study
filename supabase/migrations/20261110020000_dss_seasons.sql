-- One-tap "season" + no-reply fallbacks for Last Night's Lamp.
-- A Premium reader can tap one of 7 seasons in their email. On a morning when they didn't reply the night
-- before, Last Night's Lamp is written for their season, or picks up an earlier note they shared.
-- How a Lamp came about is kept in dss_reflections.content->'meta' ({source, season, from_date}).

alter table public.dss_subscribers add column if not exists season text;
alter table public.dss_subscribers add column if not exists season_at timestamptz;

-- Record a tapped season (link carries the reader's private token). Returns what the app needs to write the Lamp.
create or replace function public.dss_season_set(p_gate text, p_token text, p_season text)
returns json
language plpgsql
security definer
set search_path to ''
as $$
declare
  s public.dss_subscribers;
  v_tz text;
  v_next date;
begin
  perform public.dss_check_gate(p_gate);
  select * into s from public.dss_subscribers where unsub_token::text = p_token;
  if s.id is null then return json_build_object('status', 'not_found'); end if;
  if not public.dss_is_mailable(s) then return json_build_object('status', 'not_mailable'); end if;
  if not public.dss_has_premium(s) then return json_build_object('status', 'not_premium'); end if;
  update public.dss_subscribers set season = left(p_season, 40), season_at = now(), updated_at = now() where id = s.id;
  v_tz := coalesce(s.timezone, 'America/Los_Angeles');
  v_next := case when extract(hour from now() at time zone v_tz) < 5 then (now() at time zone v_tz)::date
                 else (now() at time zone v_tz)::date + 1 end;
  return json_build_object('status', 'ok', 'email', s.email, 'next_date', v_next,
    -- a Lamp already written from something they shared for that morning (don't replace it)
    'has_note', exists (select 1 from public.dss_reflections rf where rf.email = s.email and rf.for_date = v_next
                          and rf.status in ('ready', 'pending') and coalesce(rf.content->'meta'->>'source', 'reply') = 'reply'));
end;
$$;

-- Premium readers between 2 and 4 AM local with nothing written for this morning yet, plus what we can
-- personalize from: their season (if tapped in the last 30 days) and their latest note (last 21 days).
create or replace function public.dss_fallback_candidates(p_gate text, p_limit integer)
returns json
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select x.email, x.local_date as for_date,
             case when x.season_at > now() - interval '30 days' then x.season end as season,
             x.season_at,
             n.reply as last_note, n.for_date as last_note_date, n.updated_at as last_note_at
      from (
        select s.email, s.season, s.season_at,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles')) as local_now,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles'))::date as local_date
        from public.dss_subscribers s
        where public.dss_is_mailable(s) and public.dss_has_premium(s)
      ) x
      left join lateral (
        select rf.reply, rf.for_date, rf.updated_at from public.dss_reflections rf
        where rf.email = x.email and rf.for_date < x.local_date and rf.for_date >= x.local_date - 21
          and rf.status = 'ready' and coalesce(rf.content->'meta'->>'source', 'reply') = 'reply'
        order by rf.for_date desc limit 1
      ) n on true
      where extract(hour from x.local_now) between 2 and 4
        and not exists (select 1 from public.dss_reflections rf where rf.email = x.email and rf.for_date = x.local_date)
        and (n.reply is not null or (x.season is not null and x.season_at > now() - interval '30 days'))
      order by x.email
      limit greatest(1, least(p_limit, 50))
    ) r
  ), '[]'::json);
end;
$$;

-- Same as before, plus 'meta' so the email can say how this Lamp came about.
create or replace function public.dss_due_recipients(p_gate text, p_limit integer)
returns json
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select x.email, x.unsub_token, x.premium, x.local_date as study_date,
             case when x.premium then (
               select json_build_object('reply', rf.reply, 'passage', rf.content->'passage',
                                        'body', rf.content->'body', 'voice', rf.content->'voice', 'meta', rf.content->'meta')
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

create or replace function public.dss_resend_info(p_gate text, p_email text, p_date date)
returns json
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_email text := lower(trim(p_email));
  s public.dss_subscribers;
  v_yesterday json;
begin
  perform public.dss_check_gate(p_gate);
  select * into s from public.dss_subscribers where email = v_email;
  if s.id is null then return json_build_object('status', 'not_found'); end if;
  if not public.dss_is_mailable(s) then return json_build_object('status', 'not_mailable'); end if;
  if public.dss_has_premium(s) then
    select json_build_object('reply', rf.reply, 'passage', rf.content->'passage', 'body', rf.content->'body',
                             'voice', rf.content->'voice', 'meta', rf.content->'meta')
      into v_yesterday
      from public.dss_reflections rf
      where rf.email = v_email and rf.for_date = p_date and rf.status = 'ready';
  end if;
  return json_build_object('status', 'ok', 'email', v_email, 'unsub_token', s.unsub_token,
    'premium', public.dss_has_premium(s), 'yesterday', v_yesterday);
end;
$$;

revoke all on function public.dss_season_set(text, text, text) from public;
grant execute on function public.dss_season_set(text, text, text) to anon, authenticated, service_role;
revoke all on function public.dss_fallback_candidates(text, integer) from public;
grant execute on function public.dss_fallback_candidates(text, integer) to anon, authenticated, service_role;

create or replace function public.dss_today_claim(p_gate text, p_email text, p_manual boolean, p_dry boolean)
returns json
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_email text := lower(trim(p_email));
  s public.dss_subscribers;
  v_tz text;
  v_local timestamp;
  v_date date;
  v_study public.dss_studies;
  v_yesterday json;
begin
  perform public.dss_check_gate(p_gate);
  select * into s from public.dss_subscribers where email = v_email;
  if s.id is null then return json_build_object('status', 'not_found'); end if;
  if not public.dss_is_mailable(s) then
    return json_build_object('status', case
      when s.unsubscribed_at is not null then 'unsubscribed'
      when s.suspected_bot then 'flagged'
      else 'unconfirmed' end);
  end if;
  if not p_manual and coalesce((select value from public.dss_config where key = 'daily_send_open'), 'false') <> 'true' then
    return json_build_object('status', 'sending_off');
  end if;

  v_tz := coalesce(s.timezone, 'America/Los_Angeles');
  v_local := now() at time zone v_tz;
  v_date := v_local::date;
  if not p_manual and extract(hour from v_local) not between 5 and 19 then
    return json_build_object('status', 'outside_hours', 'study_date', v_date);
  end if;

  select * into v_study from public.dss_studies where study_date = v_date;
  if v_study.study_date is null or v_study.status not in ('approved', 'sent') then
    return json_build_object('status', 'no_study', 'study_date', v_date);
  end if;
  if exists (select 1 from public.dss_sends where study_date = v_date and email = v_email) then
    return json_build_object('status', 'already', 'study_date', v_date);
  end if;
  if p_dry then
    return json_build_object('status', 'ok', 'study_date', v_date);
  end if;

  insert into public.dss_sends (study_date, email, resend_id) values (v_date, v_email, null)
    on conflict do nothing;
  if not found then return json_build_object('status', 'already', 'study_date', v_date); end if;

  if public.dss_has_premium(s) then
    select json_build_object('reply', rf.reply, 'passage', rf.content->'passage', 'body', rf.content->'body',
                             'voice', rf.content->'voice', 'meta', rf.content->'meta')
      into v_yesterday
      from public.dss_reflections rf
      where rf.email = v_email and rf.for_date = v_date and rf.status = 'ready';
  end if;

  return json_build_object('status', 'ok', 'email', v_email, 'unsub_token', s.unsub_token,
    'premium', public.dss_has_premium(s), 'study_date', v_date, 'yesterday', v_yesterday);
end;
$$;
