-- Nightly Lamp (the evening check-in) goes out at 6 PM Pacific for every Premium reader, wherever they live,
-- so early sleepers get it in time to reply (owner's request, Nov 18 2026). Was 8 PM in each reader's own time.
-- Hours 18-20 Pacific so the 7 PM and 8 PM runs catch anyone the 6 PM run missed.
-- Everything else is unchanged from 20261113100000_dss_lamp_memory.
create or replace function public.dss_due_checkins(p_gate text, p_limit integer)
returns json
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.dss_check_gate(p_gate);
  if extract(hour from now() at time zone 'America/Los_Angeles') not between 18 and 20 then
    return '[]'::json;
  end if;
  return coalesce((
    select json_agg(r) from (
      select x.email, x.unsub_token, x.local_date,
             case when not x.memory_off then (
               select json_build_object('id', m.id, 'quote', m.quote, 'question', m.question, 'source_date', m.source_date)
               from public.dss_memories m
               where m.email = x.email and m.status = 'open' and m.question is not null and m.asked_on is null
                 and m.recalled_on is null
                 and m.ask_on <= x.local_date and m.source_date >= x.local_date - 30
               order by m.ask_on, m.created_at
               limit 1
             ) end as ask
      from (
        select s.email, s.unsub_token, s.memory_off,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles'))::date as local_date
        from public.dss_subscribers s
        where public.dss_is_mailable(s) and public.dss_has_premium(s)
      ) x
      where not exists (select 1 from public.dss_checkins c where c.email = x.email and c.local_date = x.local_date)
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
