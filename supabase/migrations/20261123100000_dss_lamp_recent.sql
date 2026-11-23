-- No-reply mornings that don't read like carbon copies (Nov 23 2026, Rob asked).
-- rpene310@ got three Lamps (Nov 21-23) from one note: each retold the same lost bid, the two follow-ups asked
-- the same question, and John Wesley was the voice on Nov 21 and again on Nov 23. The writer only ever saw the
-- old note, never what the reader had already been sent. This returns this reader's own recent Lamps so the
-- writer can move forward instead of repeating itself. Only the reader's own studies; never anyone else's.
create or replace function public.dss_lamp_recent(p_gate text, p_email text, p_for_date date)
returns json
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r order by r.for_date desc) from (
      select rf.for_date,
             coalesce(rf.content->'meta'->>'source', 'reply') as source,
             rf.content->'meta'->>'from_date' as from_date,
             rf.content->'voice'->>'name' as voice,
             rf.content->'passage'->>'ref' as ref,
             rf.content->'body' as body
      from public.dss_reflections rf
      where rf.email = lower(p_email) and rf.for_date < p_for_date and rf.for_date >= p_for_date - 30
        and rf.status = 'ready' and rf.content is not null
    ) r
  ), '[]'::json);
end;
$$;

revoke all on function public.dss_lamp_recent(text, text, date) from public;
grant execute on function public.dss_lamp_recent(text, text, date) to anon, authenticated, service_role;
