-- Last Night's Lamp memory (Nov 13 2026).
-- A short list per Premium reader of things they have told us that are still going on: a worry, a prayer,
-- something coming up, something they are thankful for. Each item keeps the reader's OWN WORDS (quote) and
-- the morning that note was written for (source_date), so anything Morning Lamp recalls can be traced to
-- the note it came from. The label and the follow-up question are the only AI-written parts.
--
-- The reader is in control: /my-lamp shows every item and every note, and lets them forget one item, keep
-- a note out of memory, pause memory, or delete everything.

alter table public.dss_subscribers add column if not exists memory_off boolean not null default false;
alter table public.dss_reflections add column if not exists no_memory boolean not null default false;

create table if not exists public.dss_memories (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind text not null check (kind in ('concern', 'prayer', 'event', 'thanks')),
  label text not null,
  quote text not null,
  source_date date not null,
  -- A follow-up question for a later evening check-in, and the first evening it may be asked.
  question text,
  ask_on date,
  asked_on date,
  -- The last morning a Lamp brought this back up.
  recalled_on date,
  status text not null default 'open' check (status in ('open', 'closed')),
  -- The reader's words that showed this was settled.
  closed_quote text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dss_memories_reader on public.dss_memories (email, status, source_date desc);
alter table public.dss_memories enable row level security;
revoke all on public.dss_memories from anon, authenticated;
grant select, insert, update, delete on public.dss_memories to service_role;

-- Keep memory with the reader when an admin fixes an address; drop it when a reader is deleted.
create or replace function public.dss_memories_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.dss_memories where email = old.email;
    return old;
  end if;
  if new.email is distinct from old.email then
    update public.dss_memories set email = new.email where email = old.email;
  end if;
  return new;
end;
$$;
drop trigger if exists dss_memories_follow on public.dss_subscribers;
create trigger dss_memories_follow after update of email or delete on public.dss_subscribers
  for each row execute function public.dss_memories_follow();

-- Is memory switched on for this reader and this note?
create or replace function public.dss_memory_on(p_email text, p_for_date date)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((select not s.memory_off from public.dss_subscribers s where s.email = p_email), false)
     and not coalesce((select rf.no_memory from public.dss_reflections rf where rf.email = p_email and rf.for_date = p_for_date), false);
$$;
revoke all on function public.dss_memory_on(text, date) from public, anon, authenticated;

-- What the writer may look at for the Lamp of p_for_date: the reader's open items from earlier notes
-- (newest first, last 120 days, at most 12).
create or replace function public.dss_memory_context(p_gate text, p_email text, p_for_date date)
returns json
language plpgsql
security definer
set search_path to ''
as $$
declare v_email text := lower(trim(p_email));
begin
  perform public.dss_check_gate(p_gate);
  if not public.dss_memory_on(v_email, p_for_date) then
    return json_build_object('on', false, 'items', '[]'::json);
  end if;
  return json_build_object('on', true, 'items', coalesce((
    select json_agg(m) from (
      select id, kind, label, quote, source_date, recalled_on
      from public.dss_memories
      where email = v_email and status = 'open' and source_date < p_for_date and source_date >= p_for_date - 120
      order by source_date desc, created_at desc
      limit 12
    ) m), '[]'::json));
end;
$$;
revoke all on function public.dss_memory_context(text, text, date) from public;
grant execute on function public.dss_memory_context(text, text, date) to anon, authenticated, service_role;

-- Save what one note added to memory. Replaces anything saved from the same note before (a second note the
-- same evening is joined to the first, and the whole note is read again), and closes items the reader says
-- are settled. p_new: [{kind, label, quote, question, ask_in_days}]. p_close: [{id, quote}].
create or replace function public.dss_memory_apply(p_gate text, p_email text, p_for_date date, p_new jsonb, p_close jsonb)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_email text := lower(trim(p_email));
  n integer;
begin
  perform public.dss_check_gate(p_gate);
  if not public.dss_memory_on(v_email, p_for_date) then return 0; end if;

  delete from public.dss_memories where email = v_email and source_date = p_for_date;

  insert into public.dss_memories (email, kind, label, quote, source_date, question, ask_on)
  select v_email, r->>'kind', left(r->>'label', 120), left(r->>'quote', 300), p_for_date,
         nullif(left(r->>'question', 200), ''),
         case when nullif(r->>'question', '') is not null
              -- the note was written the evening before p_for_date
              then p_for_date - 1 + greatest(2, least(coalesce((r->>'ask_in_days')::int, 4), 14)) end
  from jsonb_array_elements(coalesce(p_new, '[]'::jsonb)) r
  where r->>'kind' in ('concern', 'prayer', 'event', 'thanks')
    and length(coalesce(r->>'label', '')) > 0 and length(coalesce(r->>'quote', '')) > 0
  limit 3;
  get diagnostics n = row_count;

  update public.dss_memories m
     set status = 'closed', closed_quote = left(c->>'quote', 300), updated_at = now()
    from jsonb_array_elements(coalesce(p_close, '[]'::jsonb)) c
   where m.id::text = c->>'id' and m.email = v_email and m.status = 'open';
  return n;
end;
$$;
revoke all on function public.dss_memory_apply(text, text, date, jsonb, jsonb) from public;
grant execute on function public.dss_memory_apply(text, text, date, jsonb, jsonb) to anon, authenticated, service_role;

-- A Lamp brought this item back up on p_date.
create or replace function public.dss_memory_recalled(p_gate text, p_email text, p_id uuid, p_date date)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.dss_check_gate(p_gate);
  update public.dss_memories set recalled_on = p_date, updated_at = now()
   where id = p_id and email = lower(trim(p_email));
  return found;
end;
$$;
revoke all on function public.dss_memory_recalled(text, text, uuid, date) from public;
grant execute on function public.dss_memory_recalled(text, text, uuid, date) to anon, authenticated, service_role;

-- Evening check-ins, now with one follow-up question when the reader has one waiting ("ask").
-- A question is asked once, on or after its ask_on date, only about a note from the last 30 days, and never
-- about something a later note of theirs already picked up.
create or replace function public.dss_due_checkins(p_gate text, p_limit integer)
returns json
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select x.email, x.unsub_token, x.local_date,
             case when not x.memory_off then (
               select json_build_object('id', m.id, 'quote', m.quote, 'question', m.question, 'source_date', m.source_date)
               from public.dss_memories m
               where m.email = x.email and m.status = 'open' and m.question is not null and m.asked_on is null
                 -- once a later note of theirs has picked it up, they've already told us; don't ask
                 and m.recalled_on is null
                 and m.ask_on <= x.local_date and m.source_date >= x.local_date - 30
               order by m.ask_on, m.created_at
               limit 1
             ) end as ask
      from (
        select s.email, s.unsub_token, s.memory_off,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles')) as local_now,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles'))::date as local_date
        from public.dss_subscribers s
        where public.dss_is_mailable(s) and public.dss_has_premium(s)
      ) x
      where extract(hour from x.local_now) between 20 and 22
        and not exists (select 1 from public.dss_checkins c where c.email = x.email and c.local_date = x.local_date)
        and not exists (
          select 1 from public.dss_reflections rf
          where rf.email = x.email and rf.for_date = x.local_date + 1
            and rf.status in ('ready', 'pending')
            and coalesce(rf.content->'meta'->>'source', 'reply') = 'reply'
            and rf.reply not like 'Season: %'
        )
      order by x.email
      limit greatest(1, least(p_limit, 100))
    ) r
  ), '[]'::json);
end;
$$;

-- Recording a check-in also marks the follow-up question it carried as asked (memory_id, optional).
create or replace function public.dss_record_checkins(p_gate text, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare n integer;
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_checkins (email, local_date, resend_id)
  select r->>'email', (r->>'local_date')::date, r->>'resend_id' from jsonb_array_elements(p_rows) r
  on conflict do nothing;
  get diagnostics n = row_count;
  update public.dss_memories m
     set asked_on = (r->>'local_date')::date, updated_at = now()
    from jsonb_array_elements(p_rows) r
   where nullif(r->>'memory_id', '') is not null and m.id::text = r->>'memory_id' and m.email = r->>'email';
  return n;
end;
$$;

-- No-reply mornings: don't pick an earlier note back up when the reader has paused memory or kept that
-- note out of it. (Otherwise unchanged.)
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
        select s.email, s.season, s.season_at, s.memory_off,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles')) as local_now,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles'))::date as local_date
        from public.dss_subscribers s
        where public.dss_is_mailable(s) and public.dss_has_premium(s)
      ) x
      left join lateral (
        select rf.reply, rf.for_date, rf.updated_at from public.dss_reflections rf
        where rf.email = x.email and rf.for_date < x.local_date and rf.for_date >= x.local_date - 21
          and rf.status = 'ready' and coalesce(rf.content->'meta'->>'source', 'reply') = 'reply'
          and not rf.no_memory
        order by rf.for_date desc limit 1
      ) n on not x.memory_off
      where extract(hour from x.local_now) between 2 and 4
        and not exists (select 1 from public.dss_reflections rf where rf.email = x.email and rf.for_date = x.local_date)
        and (n.reply is not null or (x.season is not null and x.season_at > now() - interval '30 days'))
      order by x.email
      limit greatest(1, least(p_limit, 50))
    ) r
  ), '[]'::json);
end;
$$;

-- ---------- the reader's own page (/my-lamp) ----------

-- Everything Morning Lamp holds from this reader: their notes and what it remembers from them.
create or replace function public.dss_my_lamp(p_gate text, p_email text)
returns json
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_email text := lower(trim(p_email));
  s public.dss_subscribers;
begin
  perform public.dss_check_gate(p_gate);
  select * into s from public.dss_subscribers where email = v_email;
  return json_build_object(
    'found', s.id is not null,
    'premium', s.id is not null and public.dss_has_premium(s),
    'memory_off', coalesce(s.memory_off, false),
    'notes', coalesce((
      select json_agg(n) from (
        select rf.for_date, rf.reply, rf.status, rf.no_memory, rf.content->'passage'->>'ref' as passage_ref
        from public.dss_reflections rf
        where rf.email = v_email and coalesce(rf.content->'meta'->>'source', 'reply') = 'reply'
          and rf.reply not like 'Season: %'
        order by rf.for_date desc
        limit 500
      ) n), '[]'::json),
    'memories', coalesce((
      select json_agg(m) from (
        select id, kind, label, quote, source_date, status, question, asked_on, recalled_on
        from public.dss_memories
        where email = v_email
        order by (status = 'open') desc, source_date desc, created_at desc
        limit 500
      ) m), '[]'::json)
  );
end;
$$;
revoke all on function public.dss_my_lamp(text, text) from public;
grant execute on function public.dss_my_lamp(text, text) to anon, authenticated, service_role;

-- One change the reader makes on their page. The email always comes from their signed-in session.
--   forget      forget one remembered item (p_id)
--   forget_all  forget every remembered item (notes stay)
--   keep_out    keep one note (p_date) out of memory, and forget what was remembered from it
--   keep_in     allow that note again
--   delete_note delete one note (p_date), what was remembered from it, and any follow-up written from it
--   pause       stop remembering and stop bringing things back up
--   resume      start again
--   delete_all  delete every note, every Lamp written from them, and everything remembered
create or replace function public.dss_my_lamp_action(p_gate text, p_email text, p_action text, p_id uuid, p_date date)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare v_email text := lower(trim(p_email));
begin
  perform public.dss_check_gate(p_gate);
  if v_email is null or v_email = '' then return 'no_reader'; end if;

  if p_action = 'forget' and p_id is not null then
    delete from public.dss_memories where id = p_id and email = v_email;
  elsif p_action = 'forget_all' then
    delete from public.dss_memories where email = v_email;
  elsif p_action = 'keep_out' and p_date is not null then
    update public.dss_reflections set no_memory = true, updated_at = now() where email = v_email and for_date = p_date;
    delete from public.dss_memories where email = v_email and source_date = p_date;
  elsif p_action = 'keep_in' and p_date is not null then
    update public.dss_reflections set no_memory = false, updated_at = now() where email = v_email and for_date = p_date;
  elsif p_action = 'delete_note' and p_date is not null then
    delete from public.dss_memories where email = v_email and source_date = p_date;
    delete from public.dss_reflections
     where email = v_email
       and (for_date = p_date or (content->'meta'->>'source' = 'followup' and content->'meta'->>'from_date' = p_date::text));
  elsif p_action = 'pause' then
    update public.dss_subscribers set memory_off = true, updated_at = now() where email = v_email;
  elsif p_action = 'resume' then
    update public.dss_subscribers set memory_off = false, updated_at = now() where email = v_email;
  elsif p_action = 'delete_all' then
    delete from public.dss_memories where email = v_email;
    delete from public.dss_reflections where email = v_email;
  else
    return 'bad_action';
  end if;
  return 'ok';
end;
$$;
revoke all on function public.dss_my_lamp_action(text, text, text, uuid, date) from public;
grant execute on function public.dss_my_lamp_action(text, text, text, uuid, date) to anon, authenticated, service_role;
