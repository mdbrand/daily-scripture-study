-- Email engagement (Nov 11 2026): our own open pixel and click redirect, plus Resend delivery events.
-- One row per event. "source" says what made the event:
--   app     = we sent the email            resend = Resend told us (delivered / bounced / complained)
--   human   = a real mail app or browser   apple  = Apple Mail Privacy Protection (auto-open, not proof of reading)
--   bot     = security scanner, link checker, or an open too soon after sending to be a person
create table if not exists public.dss_email_events (
  id bigint generated always as identity primary key,
  email text not null,
  kind text not null check (kind in ('study', 'checkin', 'welcome', 'reply')),
  sent_date date not null,
  type text not null check (type in ('sent', 'delivered', 'bounced', 'complained', 'open', 'click', 'reply')),
  source text not null default 'app' check (source in ('app', 'resend', 'human', 'apple', 'bot')),
  link text,
  ua text,
  resend_id text,
  dedupe text unique,
  created_at timestamptz not null default now()
);
create index if not exists dss_email_events_delivery on public.dss_email_events (email, kind, sent_date, type);
create index if not exists dss_email_events_resend on public.dss_email_events (resend_id) where resend_id is not null;
create index if not exists dss_email_events_date on public.dss_email_events (sent_date);
alter table public.dss_email_events enable row level security;
revoke all on public.dss_email_events from anon, authenticated;
grant select, insert, update, delete on public.dss_email_events to service_role;

-- Keep events with the reader when an admin fixes an address; drop them when a reader is deleted.
create or replace function public.dss_email_events_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.dss_email_events where email = old.email;
    return old;
  end if;
  if new.email is distinct from old.email then
    update public.dss_email_events set email = new.email where email = old.email;
  end if;
  return new;
end;
$$;
drop trigger if exists dss_email_events_follow on public.dss_subscribers;
create trigger dss_email_events_follow after update of email or delete on public.dss_subscribers
  for each row execute function public.dss_email_events_follow();

-- Called right after a tracked send. p_rows: [{"token": "<unsub_token>", "kind": "study", "date": "YYYY-MM-DD", "resend_id": "..."}]
create or replace function public.dss_email_sent(p_gate text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_email_events (email, kind, sent_date, type, source, resend_id)
  select s.email, r->>'kind', (r->>'date')::date, 'sent', 'app', nullif(r->>'resend_id', '')
  from jsonb_array_elements(p_rows) r
  join public.dss_subscribers s on s.unsub_token::text = r->>'token';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.dss_email_sent(text, jsonb) from public;
grant execute on function public.dss_email_sent(text, jsonb) to anon, authenticated, service_role;

-- An open (pixel) or click (redirect). Only counts for an email we really sent to that reader.
create or replace function public.dss_email_event(
  p_gate text, p_token text, p_kind text, p_date date, p_type text, p_source text, p_link text, p_ua text
) returns text language plpgsql security definer set search_path = '' as $$
declare v_email text; v_sent timestamptz; v_source text := p_source;
begin
  perform public.dss_check_gate(p_gate);
  if p_type not in ('open', 'click') or p_source not in ('human', 'apple', 'bot') then return 'bad'; end if;
  select s.email into v_email from public.dss_subscribers s where s.unsub_token::text = p_token;
  if v_email is null then return 'unknown'; end if;
  select min(e.created_at) into v_sent from public.dss_email_events e
   where e.email = v_email and e.kind = p_kind and e.sent_date = p_date and e.type = 'sent';
  if v_sent is null then return 'not_sent'; end if;
  -- Nobody opens an email within 20 seconds of it leaving us: that's a mail server fetching images ahead of time.
  if p_type = 'open' and v_source = 'human' and now() - v_sent < interval '20 seconds' then v_source := 'bot'; end if;
  -- The same image reloading or a double tap is one event, and one email can't flood the table.
  if exists (select 1 from public.dss_email_events e
              where e.email = v_email and e.kind = p_kind and e.sent_date = p_date and e.type = p_type
                and e.source = v_source and e.link is not distinct from p_link
                and e.created_at > now() - interval '30 seconds') then
    return 'repeat';
  end if;
  if (select count(*) from public.dss_email_events e
       where e.email = v_email and e.kind = p_kind and e.sent_date = p_date) >= 300 then
    return 'capped';
  end if;
  insert into public.dss_email_events (email, kind, sent_date, type, source, link, ua)
  values (v_email, p_kind, p_date, p_type, v_source, left(p_link, 300), left(p_ua, 200));
  return v_source;
end;
$$;
revoke all on function public.dss_email_event(text, text, text, date, text, text, text, text) from public;
grant execute on function public.dss_email_event(text, text, text, date, text, text, text, text) to anon, authenticated, service_role;

-- Resend webhook: delivered / bounced / complained, matched to our send by Resend's email id.
create or replace function public.dss_email_webhook(p_gate text, p_resend_id text, p_type text, p_dedupe text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  perform public.dss_check_gate(p_gate);
  if p_type not in ('delivered', 'bounced', 'complained') then return false; end if;
  select e.email, e.kind, e.sent_date into v from public.dss_email_events e
   where e.resend_id = p_resend_id and e.type = 'sent' limit 1;
  if not found then return false; end if;
  insert into public.dss_email_events (email, kind, sent_date, type, source, resend_id, dedupe)
  values (v.email, v.kind, v.sent_date, p_type, 'resend', p_resend_id, p_dedupe)
  on conflict (dedupe) do nothing;
  return true;
end;
$$;
revoke all on function public.dss_email_webhook(text, text, text, text) from public;
grant execute on function public.dss_email_webhook(text, text, text, text) to anon, authenticated, service_role;

-- A reader wrote back (any email that reaches hello@ from a subscriber's address).
create or replace function public.dss_email_reply(p_gate text, p_email text, p_dedupe text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  perform public.dss_check_gate(p_gate);
  select s.email into v_email from public.dss_subscribers s where s.email = lower(trim(p_email));
  if v_email is null then return false; end if;
  insert into public.dss_email_events (email, kind, sent_date, type, source, dedupe)
  values (v_email, 'reply', (now() at time zone 'America/Los_Angeles')::date, 'reply', 'human', p_dedupe)
  on conflict (dedupe) do nothing;
  return true;
end;
$$;
revoke all on function public.dss_email_reply(text, text, text) from public;
grant execute on function public.dss_email_reply(text, text, text) to anon, authenticated, service_role;

-- Replies from before tracking began (the notes readers already sent back to a check-in).
insert into public.dss_email_events (email, kind, sent_date, type, source, dedupe, created_at)
select r.email, 'reply', (r.created_at at time zone 'America/Los_Angeles')::date, 'reply', 'human',
       'backfill-' || r.email || '-' || r.for_date, r.created_at
from public.dss_reflections r
where coalesce(r.content->'meta'->>'source', 'reply') = 'reply'
  and r.reply is not null and r.reply not like 'Season:%'
  and exists (select 1 from public.dss_subscribers s where s.email = r.email)
on conflict (dedupe) do nothing;

-- Everything the admin engagement page shows, in one call.
-- "opened" = a real mail app loaded the email, or the reader clicked a link in it (a click proves an open).
-- "apple_only" = the only open came from Apple Mail Privacy Protection, so we can't tell either way.
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
