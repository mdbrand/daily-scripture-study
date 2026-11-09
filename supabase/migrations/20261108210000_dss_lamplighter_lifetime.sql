-- Lamplighters (the first 100 beta testers) get Premium free for life, not 90 days.
-- Lifetime is stored as beta_until = 'infinity', so dss_has_premium (beta_until > now()) stays true forever.

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
    update public.dss_subscribers set beta_until = 'infinity'::timestamptz, updated_at = now() where email = v_email;
  end if;
  return json_build_object('ok', true);
end;
$$;

-- Anyone already accepted moves to lifetime too.
update public.dss_subscribers s set beta_until = 'infinity'::timestamptz, updated_at = now()
  from public.dss_lamplighters l
  where l.email = s.email and l.status = 'accepted';

-- Admin edit: beta_until accepts 'lifetime' as well as a date or blank.
create or replace function public.dss_admin_beta_value(p_val text)
returns timestamptz language sql stable set search_path = '' as $$
  select case
    when coalesce(p_val, '') = '' then null
    when p_val = 'lifetime' then 'infinity'::timestamptz
    else (p_val::date + time '23:59') at time zone 'America/Los_Angeles'
  end;
$$;
revoke all on function public.dss_admin_beta_value(text) from public, anon, authenticated;

create or replace function public.dss_admin_subscriber_update(p_gate text, p_email text, p_patch jsonb)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_new text := lower(trim(coalesce(p_patch->>'email', v_email)));
  v_tz text := p_patch->>'timezone';
begin
  perform public.dss_check_gate(p_gate);
  if not exists (select 1 from public.dss_subscribers where email = v_email) then
    return json_build_object('ok', false, 'error', 'That subscriber no longer exists.');
  end if;

  if p_patch ? 'timezone' and v_tz is not null and v_tz <> ''
     and not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    return json_build_object('ok', false, 'error', 'That time zone isn’t recognized. Use a name like America/New_York.');
  end if;

  if v_new <> v_email then
    if v_new !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
      return json_build_object('ok', false, 'error', 'That new email address isn’t valid.');
    end if;
    if exists (select 1 from public.dss_subscribers where email = v_new) then
      return json_build_object('ok', false, 'error', 'Another subscriber already uses that email.');
    end if;
    if exists (select 1 from public.dss_subscriptions where email = v_email)
       or exists (select 1 from public.dss_founders where email = v_email)
       or exists (select 1 from public.dss_partners where email = v_email) then
      return json_build_object('ok', false, 'error', 'This person has a paid membership or partner account tied to their email, so it can’t be changed here.');
    end if;
    update public.dss_subscribers set email = v_new where email = v_email;
    update public.dss_sends set email = v_new where email = v_email;
    update public.dss_reflections set email = v_new where email = v_email;
    update public.dss_checkins set email = v_new where email = v_email;
    update public.dss_lamplighters set email = v_new where email = v_email;
    delete from public.dss_login_tokens where email = v_email;
  end if;

  update public.dss_subscribers set
    timezone = case when p_patch ? 'timezone' then nullif(v_tz, '') else timezone end,
    plan_interest = case when p_patch->>'plan_interest' in ('free', 'premium') then p_patch->>'plan_interest' else plan_interest end,
    unsubscribed_at = case when p_patch ? 'unsubscribed' then
                        case when (p_patch->>'unsubscribed')::boolean then coalesce(unsubscribed_at, now()) else null end
                      else unsubscribed_at end,
    suspected_bot = case when p_patch ? 'suspected_bot' then (p_patch->>'suspected_bot')::boolean else suspected_bot end,
    beta_until = case when p_patch ? 'beta_until' then public.dss_admin_beta_value(p_patch->>'beta_until') else beta_until end,
    admin_note = case when p_patch ? 'admin_note' then nullif(left(p_patch->>'admin_note', 1000), '') else admin_note end,
    updated_at = now()
  where email = v_new;
  return json_build_object('ok', true, 'email', v_new);
end;
$$;
