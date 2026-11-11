-- Admin funnel (Nov 10 2026): sign-ups -> confirmed -> got a check-in -> replied or tapped a season
-- -> still subscribed after 7 / 30 days. Two cohorts: people who signed up in the last 30 days, and everyone.
create or replace function public.dss_admin_funnel(p_gate text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_out json;
begin
  perform public.dss_check_gate(p_gate);
  with base as (
    select s.email, s.created_at, s.confirmed_at, s.unsubscribed_at, s.season,
           public.dss_has_premium(s) as premium,
           s.created_at >= now() - interval '30 days' as recent
    from public.dss_subscribers s
    where not s.suspected_bot and coalesce(s.source, '') <> 'test'
  ),
  f as (
    select b.*,
      exists (select 1 from public.dss_checkins c where c.email = b.email) as got_checkin,
      exists (select 1 from public.dss_reflections r where r.email = b.email
                and coalesce(r.content->'meta'->>'source', 'reply') = 'reply'
                and r.reply is not null and r.reply not like 'Season:%') as replied,
      b.season is not null as tapped_season
    from base b
  ),
  agg as (
    select scope,
      count(*) as signups,
      count(*) filter (where confirmed_at is not null) as confirmed,
      count(*) filter (where confirmed_at is not null and premium) as premium,
      count(*) filter (where got_checkin) as got_checkin,
      count(*) filter (where replied) as replied,
      count(*) filter (where replied or tapped_season) as engaged,
      count(*) filter (where confirmed_at is not null and created_at <= now() - interval '7 days') as eligible_7d,
      count(*) filter (where confirmed_at is not null and created_at <= now() - interval '7 days'
                         and (unsubscribed_at is null or unsubscribed_at > created_at + interval '7 days')) as kept_7d,
      count(*) filter (where confirmed_at is not null and created_at <= now() - interval '30 days') as eligible_30d,
      count(*) filter (where confirmed_at is not null and created_at <= now() - interval '30 days'
                         and (unsubscribed_at is null or unsubscribed_at > created_at + interval '30 days')) as kept_30d
    from (select f.*, 'all' as scope from f union all select f.*, 'recent' as scope from f where f.recent) x
    group by scope
  )
  select json_object_agg(scope, row_to_json(agg)) into v_out from agg;
  return coalesce(v_out, '{}'::json);
end;
$$;
revoke all on function public.dss_admin_funnel(text) from public;
grant execute on function public.dss_admin_funnel(text) to anon, authenticated, service_role;
