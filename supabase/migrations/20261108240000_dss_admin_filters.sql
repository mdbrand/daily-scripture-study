-- One definition of every Overview number, so clicking a card lists exactly the people it counts.
create or replace function public.dss_admin_filter_match(s public.dss_subscribers, p_lamp text, p_filter text)
returns boolean language sql stable set search_path = '' as $$
  select case coalesce(p_filter, 'all')
    when 'getting' then public.dss_is_mailable(s)
    when 'today' then (s.created_at at time zone 'America/Los_Angeles')::date = (now() at time zone 'America/Los_Angeles')::date
    when 'week' then s.created_at > now() - interval '7 days'
    when 'month' then s.created_at > now() - interval '30 days'
    when 'chose_premium' then s.plan_interest = 'premium'
    when 'partner' then s.referred_by is not null
    when 'unsubscribed' then s.unsubscribed_at is not null
    when 'flagged' then s.suspected_bot or s.email_flag is not null
    when 'unconfirmed' then s.confirmed_at is null and s.unsubscribed_at is null and not s.suspected_bot
    when 'free' then not public.dss_has_premium(s)
    when 'premium' then public.dss_has_premium(s)
    when 'lamplighters' then p_lamp = 'accepted'
    when 'monthly' then exists (select 1 from public.dss_subscriptions x where x.email = s.email and x.plan = 'monthly' and x.status in ('active', 'trialing'))
    when 'yearly' then exists (select 1 from public.dss_subscriptions x where x.email = s.email and x.plan = 'yearly' and x.status in ('active', 'trialing'))
    when 'paid' then exists (select 1 from public.dss_subscriptions x where x.email = s.email and x.status in ('active', 'trialing'))
    when 'canceling' then exists (select 1 from public.dss_subscriptions x where x.email = s.email and x.status in ('active', 'trialing') and x.cancel_at_period_end)
    when 'past_due' then exists (select 1 from public.dss_subscriptions x where x.email = s.email and x.status in ('past_due', 'unpaid'))
    when 'founders' then exists (select 1 from public.dss_founders x where x.email = s.email and x.status = 'paid')
    else true end;
$$;
revoke all on function public.dss_admin_filter_match(public.dss_subscribers, text, text) from public, anon, authenticated;

create or replace function public.dss_admin_subscribers(p_gate text, p_search text, p_filter text, p_limit integer, p_offset integer)
returns json language plpgsql security definer set search_path = '' as $$
declare v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
  perform public.dss_check_gate(p_gate);
  return json_build_object(
    'total', (
      select count(*) from public.dss_subscribers s
      left join public.dss_lamplighters l on l.email = s.email
      where (v_q is null or s.email like '%' || v_q || '%')
        and public.dss_admin_filter_match(s, l.status, p_filter)
    ),
    'rows', coalesce((
      select json_agg(r) from (
        select s.email, s.created_at, s.plan_interest, s.premium_status, s.timezone, s.source, s.referred_by,
               s.unsubscribed_at, s.suspected_bot, s.email_flag, s.welcomed_at, s.beta_until,
               l.status as lamplighter,
               (select count(*) from public.dss_sends d where d.email = s.email) as studies_received
        from public.dss_subscribers s
        left join public.dss_lamplighters l on l.email = s.email
        where (v_q is null or s.email like '%' || v_q || '%')
          and public.dss_admin_filter_match(s, l.status, p_filter)
        order by s.created_at desc
        limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset)
      ) r
    ), '[]'::json)
  );
end;
$$;

-- Overview: also count Lamplighters (Premium free for life).
create or replace function public.dss_admin_lamplighter_count(p_gate text)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return (select count(*) from public.dss_lamplighters where status = 'accepted');
end;
$$;
revoke all on function public.dss_admin_lamplighter_count(text) from public;
grant execute on function public.dss_admin_lamplighter_count(text) to anon, authenticated, service_role;
