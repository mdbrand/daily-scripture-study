-- Lamp variety (Nov 17 2026). Two readers who wrote about the same thing on the same night got Lamps
-- from the same chapter (Isaiah 40) with the same shape, because the writer saw one reader at a time.

-- 1. Which passages are already taken: other readers' Lamps for that morning, and this reader's own Lamps
--    from the 30 days before it. Returns references only, never anyone's note or study text.
create or replace function public.dss_lamp_passages_used(p_gate text, p_email text, p_for_date date)
returns json
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.dss_check_gate(p_gate);
  return json_build_object(
    'today', coalesce((
      select json_agg(rf.content->'passage'->>'ref' order by rf.updated_at)
      from public.dss_reflections rf
      where rf.for_date = p_for_date and rf.email <> lower(p_email)
        and rf.status = 'ready' and rf.content->'passage'->>'ref' is not null
    ), '[]'::json),
    'mine', coalesce((
      select json_agg(rf.content->'passage'->>'ref' order by rf.for_date desc)
      from public.dss_reflections rf
      where rf.email = lower(p_email) and rf.for_date < p_for_date and rf.for_date >= p_for_date - 30
        and rf.status = 'ready' and rf.content->'passage'->>'ref' is not null
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.dss_lamp_passages_used(text, text, date) from public;
grant execute on function public.dss_lamp_passages_used(text, text, date) to anon, authenticated, service_role;

-- 2. "Picking up where you left off" at most twice per note. Before this, a reader who stopped replying got
--    a follow-up on the same note every morning for up to 21 days (Nov 14-17: four in a row). After two,
--    the morning falls back to the season they tapped, or the "What season are you in?" buttons.
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
        -- Only the latest note is ever picked up, and only twice; an older note never takes its place.
        and (
          select count(*) from public.dss_reflections f
          where f.email = x.email and f.content->'meta'->>'source' = 'followup'
            and f.content->'meta'->>'from_date' = n.for_date::text
        ) < 2
      where extract(hour from x.local_now) between 2 and 4
        and not exists (select 1 from public.dss_reflections rf where rf.email = x.email and rf.for_date = x.local_date)
        and (n.reply is not null or (x.season is not null and x.season_at > now() - interval '30 days'))
      order by x.email
      limit greatest(1, least(p_limit, 50))
    ) r
  ), '[]'::json);
end;
$$;
