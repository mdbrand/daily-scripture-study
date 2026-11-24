-- Engagement page (Nov 23 2026): "Times opened" per reader, so reopens of the same email show.
-- "opened" stays the number of emails a reader opened; "times_opened" counts every real open.
create or replace function public.dss_admin_engagement(p_gate text)
returns json language plpgsql security definer set search_path = '' as $$
declare v_out json; v_today date := (now() at time zone 'America/Los_Angeles')::date;
begin
  perform public.dss_check_gate(p_gate);
  with ev as (
    select e.*,
      -- A security scanner "clicks" every link in the same second. A person can't.
      (e.type = 'click' and e.source = 'human' and not exists (
         select 1 from public.dss_email_events c
          where c.type = 'click' and c.email = e.email and c.kind = e.kind and c.sent_date = e.sent_date
            and c.id <> e.id and c.link is distinct from e.link
            and abs(extract(epoch from c.created_at - e.created_at)) < 3)) as good_click
    from public.dss_email_events e
  ),
  d as (
    select email, kind, sent_date,
      bool_or(type = 'delivered') as delivered,
      bool_or(type = 'bounced') as bounced,
      bool_or(type = 'complained') as complained,
      bool_or((type = 'open' and source = 'human') or good_click) as opened,
      bool_or(type = 'open' and source = 'apple') as apple,
      bool_or(good_click) as clicked,
      count(*) filter (where type = 'open' and source = 'human') as views,
      max(created_at) filter (where (type = 'open' and source = 'human') or good_click) as last_seen
    from ev where kind <> 'reply'
    group by 1, 2, 3
    having bool_or(type = 'sent')
  ),
  w as (
    select * from (values ('7d', v_today - 6, 1), ('30d', v_today - 29, 2), ('all', date '2000-01-01', 3)) x(win, since, ord)
  ),
  agg as (
    select w.win, coalesce(d.kind, 'total') as kind,
      count(*) as sent,
      count(*) filter (where d.delivered) as delivered,
      count(*) filter (where d.bounced) as bounced,
      count(*) filter (where d.complained) as complained,
      count(*) filter (where d.opened) as opened,
      count(*) filter (where d.apple and not d.opened) as apple_only,
      count(*) filter (where d.clicked) as clicked,
      count(distinct d.email) as readers
    from w join d on d.sent_date >= w.since
    group by w.win, grouping sets ((d.kind), ())
  ),
  ppl as (
    select w.win, w.ord,
      (select count(distinct d.email) from d where d.sent_date >= w.since) as readers,
      (select count(distinct d.email) from d where d.sent_date >= w.since
         and (d.opened or exists (select 1 from ev r where r.type = 'reply' and r.email = d.email and r.sent_date >= w.since))) as engaged,
      (select count(distinct d.email) from d where d.sent_date >= w.since
         and not exists (select 1 from d o where o.email = d.email and o.sent_date >= w.since and o.opened)
         and exists (select 1 from d a where a.email = d.email and a.sent_date >= w.since and a.apple)) as apple_readers,
      (select count(distinct x.email) from (
         select email from public.dss_sends where study_date >= w.since
         union all select email from public.dss_checkins where local_date >= w.since
         union all select email from d where d.sent_date >= w.since) x) as mailed,
      (select count(*) from ev where type = 'reply' and sent_date >= w.since) as replies,
      (select count(distinct email) from ev where type = 'reply' and sent_date >= w.since) as repliers,
      (select count(*) from public.dss_subscribers s where s.unsubscribed_at is not null
         and (s.unsubscribed_at at time zone 'America/Los_Angeles')::date >= w.since) as unsubscribed,
      (select count(*) from public.dss_subscribers s where s.season_at is not null
         and (s.season_at at time zone 'America/Los_Angeles')::date >= w.since) as season_taps
    from w
  ),
  days as (
    select d.sent_date as date, (select st.content->>'title' from public.dss_studies st where st.study_date = d.sent_date) as title,
      count(*) as sent,
      count(*) filter (where d.opened) as opened,
      count(*) filter (where d.apple and not d.opened) as apple_only,
      count(*) filter (where d.clicked) as clicked
    from d where d.kind = 'study' and d.sent_date >= v_today - 13
    group by d.sent_date
  ),
  links as (
    select link, count(*) as clicks, count(distinct email) as people
    from ev where good_click and sent_date >= v_today - 29 and link is not null
    group by link order by 2 desc, 1 limit 12
  ),
  readers as (
    select d.email,
      count(*) as sent,
      count(*) filter (where d.opened) as opened,
      -- Every real open, reopens included (the 30-second double-load guard still applies). An email opened
      -- only by clicking a link counts once, so this is never lower than "opened".
      greatest(sum(d.views), count(*) filter (where d.opened))::int as times_opened,
      count(*) filter (where d.apple and not d.opened) as apple_only,
      count(*) filter (where d.clicked) as clicked,
      (select count(*) from ev r where r.type = 'reply' and r.email = d.email) as replies,
      greatest(max(d.last_seen), (select max(r.created_at) from ev r where r.type = 'reply' and r.email = d.email)) as last_seen
    from d group by d.email
  )
  select json_build_object(
    'since', (select min(created_at) from ev where type = 'sent'),
    'windows', coalesce((select json_object_agg(win, kinds) from (
        select a.win, json_object_agg(a.kind, json_build_object(
          'sent', a.sent, 'delivered', a.delivered, 'bounced', a.bounced, 'complained', a.complained,
          'opened', a.opened, 'apple_only', a.apple_only, 'clicked', a.clicked, 'readers', a.readers)) as kinds
        from agg a group by a.win) x), '{}'::json),
    'people', coalesce((select json_object_agg(p.win, json_build_object(
          'readers', p.readers, 'engaged', p.engaged, 'apple_readers', p.apple_readers, 'mailed', p.mailed,
          'replies', p.replies, 'repliers', p.repliers, 'unsubscribed', p.unsubscribed, 'season_taps', p.season_taps)) from ppl p), '{}'::json),
    'days', coalesce((select json_agg(row_to_json(y) order by y.date desc) from days y), '[]'::json),
    'links', coalesce((select json_agg(row_to_json(l)) from links l), '[]'::json),
    'readers', coalesce((select json_agg(row_to_json(r) order by r.opened desc, r.replies desc, r.email) from (
        select * from readers order by opened desc, replies desc, email limit 500) r), '[]'::json)
  ) into v_out;
  return v_out;
end;
$$;
revoke all on function public.dss_admin_engagement(text) from public;
grant execute on function public.dss_admin_engagement(text) to anon, authenticated, service_role;
