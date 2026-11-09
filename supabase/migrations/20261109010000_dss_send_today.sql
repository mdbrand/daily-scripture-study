-- Send today's study to one person who missed the 5 AM run (signed up later in the day).
-- p_manual = true: the admin's "Send today's study now" button (any hour, even while daily sending is off).
-- p_manual = false: automatic, right after they confirm, only 5:00 AM to 7:59 PM their time.
-- p_dry = true: only report whether it would send (used to word the welcome email).
-- The dss_sends row is claimed before sending, so nobody gets the same day twice.
create or replace function public.dss_today_claim(p_gate text, p_email text, p_manual boolean, p_dry boolean)
returns json language plpgsql security definer set search_path = '' as $$
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
    select json_build_object('reply', rf.reply, 'passage', rf.content->'passage', 'body', rf.content->'body', 'voice', rf.content->'voice')
      into v_yesterday
      from public.dss_reflections rf
      where rf.email = v_email and rf.for_date = v_date and rf.status = 'ready';
  end if;

  return json_build_object('status', 'ok', 'email', v_email, 'unsub_token', s.unsub_token,
    'premium', public.dss_has_premium(s), 'study_date', v_date, 'yesterday', v_yesterday);
end;
$$;

-- After the email is accepted: store the Resend id and refresh the study's sent count.
-- On failure: release the claim so it can be tried again.
create or replace function public.dss_today_finish(p_gate text, p_email text, p_date date, p_resend_id text, p_ok boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  if p_ok then
    update public.dss_sends set resend_id = p_resend_id where study_date = p_date and email = lower(trim(p_email));
    update public.dss_studies set sent_count = (select count(*) from public.dss_sends where study_date = p_date)
      where study_date = p_date;
  else
    delete from public.dss_sends where study_date = p_date and email = lower(trim(p_email)) and resend_id is null;
  end if;
end;
$$;

revoke all on function public.dss_today_claim(text, text, boolean, boolean) from public;
grant execute on function public.dss_today_claim(text, text, boolean, boolean) to anon, authenticated, service_role;
revoke all on function public.dss_today_finish(text, text, date, text, boolean) from public;
grant execute on function public.dss_today_finish(text, text, date, text, boolean) to anon, authenticated, service_role;
