-- Admin: add people by hand. Either start them right away (confirmed now) or leave them unconfirmed
-- so the app sends a confirm invite. Never re-adds someone who unsubscribed.
create or replace function public.dss_admin_add_subscriber(
  p_gate text, p_email text, p_premium boolean, p_start_now boolean, p_timezone text, p_added_by text
)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_tz text := nullif(trim(coalesce(p_timezone, '')), '');
  v_note text := 'Added by ' || coalesce(p_added_by, 'admin') || ' on ' || to_char(now() at time zone 'America/Los_Angeles', 'Mon DD, YYYY')
                 || case when p_start_now then ' (started right away)' else ' (sent a confirm invite)' end;
  s public.dss_subscribers;
begin
  perform public.dss_check_gate(p_gate);
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    return json_build_object('status', 'invalid');
  end if;
  if v_tz is not null and not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := null;
  end if;

  select * into s from public.dss_subscribers where email = v_email;
  if s.id is not null then
    if s.unsubscribed_at is not null then
      return json_build_object('status', 'unsubscribed');
    end if;
    update public.dss_subscribers set
      beta_until = case when p_premium then 'infinity'::timestamptz else beta_until end,
      plan_interest = case when p_premium then 'premium' else plan_interest end,
      confirmed_at = case when p_start_now then coalesce(confirmed_at, now()) else confirmed_at end,
      suspected_bot = case when p_start_now then false else suspected_bot end,
      timezone = coalesce(timezone, v_tz),
      admin_note = left(coalesce(admin_note || E'\n', '') || v_note, 1000),
      updated_at = now()
    where email = v_email;
    return json_build_object('status', 'existing', 'confirmed', p_start_now or s.confirmed_at is not null);
  end if;

  insert into public.dss_subscribers (email, plan_interest, source, consent_text, timezone, beta_until, confirmed_at, admin_note)
  values (
    v_email,
    case when p_premium then 'premium' else 'free' end,
    'admin',
    case when p_start_now then 'Added by ' || coalesce(p_added_by, 'admin') || ', who confirmed this person agreed to receive Morning Lamp'
         else 'Invited by ' || coalesce(p_added_by, 'admin') || '; receives nothing until they confirm' end,
    v_tz,
    case when p_premium then 'infinity'::timestamptz else null end,
    case when p_start_now then now() else null end,
    v_note
  );
  return json_build_object('status', 'added', 'confirmed', p_start_now);
end;
$$;
revoke all on function public.dss_admin_add_subscriber(text, text, boolean, boolean, text, text) from public;
grant execute on function public.dss_admin_add_subscriber(text, text, boolean, boolean, text, text) to anon, authenticated, service_role;
