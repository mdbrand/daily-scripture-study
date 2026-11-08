-- Read-only views for the admin portal.

create or replace function public.dss_admin_overview(p_gate text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'America/Los_Angeles')::date;
begin
  perform public.dss_check_gate(p_gate);
  return json_build_object(
    'subscribers', json_build_object(
      'total', (select count(*) from public.dss_subscribers),
      'mailable', (select count(*) from public.dss_subscribers s where public.dss_is_mailable(s)),
      'unsubscribed', (select count(*) from public.dss_subscribers where unsubscribed_at is not null),
      'flagged_bot', (select count(*) from public.dss_subscribers where suspected_bot),
      'privacy_relay', (select count(*) from public.dss_subscribers where email_flag = 'privacy_relay'),
      'new_today', (select count(*) from public.dss_subscribers where (created_at at time zone 'America/Los_Angeles')::date = v_today),
      'new_7d', (select count(*) from public.dss_subscribers where created_at > now() - interval '7 days'),
      'new_30d', (select count(*) from public.dss_subscribers where created_at > now() - interval '30 days'),
      'wanted_premium', (select count(*) from public.dss_subscribers where plan_interest = 'premium'),
      'referred', (select count(*) from public.dss_subscribers where referred_by is not null)
    ),
    'premium', json_build_object(
      'monthly', (select count(*) from public.dss_subscriptions where plan = 'monthly' and status in ('active', 'trialing')),
      'yearly', (select count(*) from public.dss_subscriptions where plan = 'yearly' and status in ('active', 'trialing')),
      'canceling', (select count(*) from public.dss_subscriptions where status in ('active', 'trialing') and cancel_at_period_end),
      'past_due', (select count(*) from public.dss_subscriptions where status in ('past_due', 'unpaid')),
      'canceled', (select count(*) from public.dss_subscriptions where status = 'canceled'),
      'founders', (select count(*) from public.dss_founders where status = 'paid')
    ),
    'partners', json_build_object(
      'count', (select count(*) from public.dss_partners),
      'pending_cents', coalesce((select sum(commission_cents) from public.dss_commissions where status = 'pending'), 0),
      'earned_cents', coalesce((select sum(commission_cents) from public.dss_commissions where status = 'earned'), 0),
      'paid_cents', coalesce((select sum(commission_cents) from public.dss_commissions where status = 'paid'), 0)
    ),
    'sending', json_build_object(
      'open', coalesce((select value from public.dss_config where key = 'daily_send_open'), 'false') = 'true',
      'sent_7d', (select count(*) from public.dss_sends where created_at > now() - interval '7 days')
    ),
    'sources', coalesce((
      select json_agg(r) from (
        select coalesce(source, '(none)') as label, count(*) as n from public.dss_subscribers
        group by 1 order by 2 desc limit 8
      ) r
    ), '[]'::json),
    'timezones', coalesce((
      select json_agg(r) from (
        select coalesce(timezone, '(unknown, uses Pacific)') as label, count(*) as n from public.dss_subscribers
        group by 1 order by 2 desc limit 8
      ) r
    ), '[]'::json),
    'signups_by_day', coalesce((
      select json_agg(r order by r.day) from (
        select (created_at at time zone 'America/Los_Angeles')::date as day, count(*) as n
        from public.dss_subscribers where created_at > now() - interval '14 days'
        group by 1
      ) r
    ), '[]'::json)
  );
end;
$$;

create or replace function public.dss_admin_subscribers(p_gate text, p_search text, p_filter text, p_limit integer, p_offset integer)
returns json language plpgsql security definer set search_path = '' as $$
declare v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
  perform public.dss_check_gate(p_gate);
  return json_build_object(
    'total', (
      select count(*) from public.dss_subscribers s
      where (v_q is null or s.email like '%' || v_q || '%')
        and case coalesce(p_filter, 'all')
          when 'premium' then s.premium_status in ('founder', 'monthly', 'yearly')
          when 'free' then coalesce(s.premium_status, '') not in ('founder', 'monthly', 'yearly')
          when 'unsubscribed' then s.unsubscribed_at is not null
          when 'flagged' then s.suspected_bot or s.email_flag is not null
          else true end
    ),
    'rows', coalesce((
      select json_agg(r) from (
        select s.email, s.created_at, s.plan_interest, s.premium_status, s.timezone, s.source, s.referred_by,
               s.unsubscribed_at, s.suspected_bot, s.email_flag, s.welcomed_at,
               (select count(*) from public.dss_sends d where d.email = s.email) as studies_received
        from public.dss_subscribers s
        where (v_q is null or s.email like '%' || v_q || '%')
          and case coalesce(p_filter, 'all')
            when 'premium' then s.premium_status in ('founder', 'monthly', 'yearly')
            when 'free' then coalesce(s.premium_status, '') not in ('founder', 'monthly', 'yearly')
            when 'unsubscribed' then s.unsubscribed_at is not null
            when 'flagged' then s.suspected_bot or s.email_flag is not null
            else true end
        order by s.created_at desc
        limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset)
      ) r
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.dss_admin_overview(text) from public;
grant execute on function public.dss_admin_overview(text) to anon, authenticated, service_role;
revoke all on function public.dss_admin_subscribers(text, text, text, integer, integer) from public;
grant execute on function public.dss_admin_subscribers(text, text, text, integer, integer) to anon, authenticated, service_role;
