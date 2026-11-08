-- Admin: view, edit, and delete individual subscribers (spam cleanup, corrections).

alter table public.dss_subscribers add column if not exists admin_note text;

-- One subscriber with everything linked to them.
create or replace function public.dss_admin_subscriber_get(p_gate text, p_email text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(p_email));
begin
  perform public.dss_check_gate(p_gate);
  return (
    select json_build_object(
      'email', s.email, 'created_at', s.created_at, 'plan_interest', s.plan_interest, 'premium_status', s.premium_status,
      'timezone', s.timezone, 'source', s.source, 'referred_by', s.referred_by, 'unsubscribed_at', s.unsubscribed_at,
      'suspected_bot', s.suspected_bot, 'email_flag', s.email_flag, 'welcomed_at', s.welcomed_at, 'beta_until', s.beta_until,
      'admin_note', s.admin_note, 'user_agent', s.user_agent,
      'has_premium', public.dss_has_premium(s),
      'studies_received', (select count(*) from public.dss_sends d where d.email = s.email),
      'last_study', (select max(study_date) from public.dss_sends d where d.email = s.email),
      'replies', (select count(*) from public.dss_reflections r where r.email = s.email),
      'lamplighter', (select status from public.dss_lamplighters l where l.email = s.email),
      'subscription', (select json_build_object('plan', plan, 'status', status, 'current_period_end', current_period_end,
                                                'cancel_at_period_end', cancel_at_period_end)
                       from public.dss_subscriptions x where x.email = s.email order by x.created_at desc limit 1),
      'founder', exists (select 1 from public.dss_founders f where f.email = s.email and f.status = 'paid'),
      'partner_code', (select code from public.dss_partners p where p.email = s.email)
    )
    from public.dss_subscribers s where s.email = v_email
  );
end;
$$;

-- Edit. p_patch keys (all optional): email, timezone, plan_interest, unsubscribed (bool),
-- suspected_bot (bool), beta_until (ISO date or null), admin_note.
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
    beta_until = case when p_patch ? 'beta_until' then
                   case when coalesce(p_patch->>'beta_until', '') = '' then null
                        else ((p_patch->>'beta_until')::date + time '23:59') at time zone 'America/Los_Angeles' end
                 else beta_until end,
    admin_note = case when p_patch ? 'admin_note' then nullif(left(p_patch->>'admin_note', 1000), '') else admin_note end,
    updated_at = now()
  where email = v_new;
  return json_build_object('ok', true, 'email', v_new);
end;
$$;

-- Delete for good (spam, test sign-ups). Paid members must be canceled in Stripe first.
-- Payment, commission, and payout records are kept for accounting.
create or replace function public.dss_admin_subscriber_delete(p_gate text, p_emails text[])
returns json language plpgsql security definer set search_path = '' as $$
declare v_blocked text[]; v_ok text[];
begin
  perform public.dss_check_gate(p_gate);
  select coalesce(array_agg(e), '{}') into v_blocked from unnest(p_emails) e
   where exists (select 1 from public.dss_subscriptions x where x.email = lower(trim(e)) and x.status in ('active', 'trialing', 'past_due'))
      or exists (select 1 from public.dss_founders f where f.email = lower(trim(e)) and f.status = 'paid');
  select coalesce(array_agg(lower(trim(e))), '{}') into v_ok from unnest(p_emails) e where not (e = any(v_blocked));
  delete from public.dss_sends where email = any(v_ok);
  delete from public.dss_reflections where email = any(v_ok);
  delete from public.dss_checkins where email = any(v_ok);
  delete from public.dss_lamplighters where email = any(v_ok);
  delete from public.dss_login_tokens where email = any(v_ok);
  delete from public.dss_subscribers where email = any(v_ok);
  return json_build_object('deleted', coalesce(array_length(v_ok, 1), 0), 'blocked', v_blocked);
end;
$$;

revoke all on function public.dss_admin_subscriber_get(text, text) from public;
grant execute on function public.dss_admin_subscriber_get(text, text) to anon, authenticated, service_role;
revoke all on function public.dss_admin_subscriber_update(text, text, jsonb) from public;
grant execute on function public.dss_admin_subscriber_update(text, text, jsonb) to anon, authenticated, service_role;
revoke all on function public.dss_admin_subscriber_delete(text, text[]) from public;
grant execute on function public.dss_admin_subscriber_delete(text, text[]) to anon, authenticated, service_role;
