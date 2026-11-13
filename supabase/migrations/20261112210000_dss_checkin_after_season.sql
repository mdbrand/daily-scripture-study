-- A season tap must not cancel that night's check-in, and a note written after a season tap must replace
-- the season Lamp instead of being joined onto it.
--
-- Before: dss_due_checkins skipped anyone with ANY Lamp on file for tomorrow. A reader who tapped a season
-- at 5 AM (which writes tomorrow's Lamp straight away) got no 8 PM check-in, though that morning's email
-- had promised one. And if they replied anyway, dss_reflection_save joined their note onto the stored
-- "Season: ..." text, so the Lamp would quote "Season: Need a lift" back at them as if they had written it.

-- 1) The evening check-in is skipped only when the reader has already shared a note of their own for
--    tomorrow morning. A season tap, a follow-up, or a note that produced no Lamp does not cancel it.
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
      select x.email, x.unsub_token, x.local_date
      from (
        select s.email, s.unsub_token,
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

-- 2) A new note is joined to what is on file only when what is on file is the reader's own earlier note
--    for that morning. If it is a season Lamp or a follow-up, the new note replaces it.
create or replace function public.dss_reflection_save(p_gate text, p_email text, p_for_date date, p_reply text, p_content jsonb, p_status text, p_note text)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare v_reply text;
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_reflections (email, for_date, reply, content, status, note)
  values (lower(trim(p_email)), p_for_date, left(p_reply, 4000), p_content, p_status, p_note)
  on conflict (email, for_date) do update set
    reply = case when p_content is null
                      and public.dss_reflections.reply <> excluded.reply
                      and coalesce(public.dss_reflections.content->'meta'->>'source', 'reply') = 'reply'
                      and public.dss_reflections.reply not like 'Season: %'
                 then left(public.dss_reflections.reply || E'\n\n' || excluded.reply, 4000)
                 else excluded.reply end,
    content = excluded.content,
    status = excluded.status,
    note = excluded.note,
    updated_at = now()
  returning reply into v_reply;
  return v_reply;
end;
$$;
