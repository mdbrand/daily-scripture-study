-- Premium "Yesterday" section now carries one voice from history: include it with each due reader.
create or replace function public.dss_due_recipients(p_gate text, p_limit integer)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select x.email, x.unsub_token, x.premium, x.local_date as study_date,
             case when x.premium then (
               select json_build_object('reply', rf.reply, 'passage', rf.content->'passage',
                                        'body', rf.content->'body', 'voice', rf.content->'voice')
               from public.dss_reflections rf
               where rf.email = x.email and rf.for_date = x.local_date and rf.status = 'ready'
             ) end as yesterday
      from (
        select s.email, s.unsub_token, s.created_at,
               coalesce(s.premium_status in ('founder', 'monthly', 'yearly'), false) as premium,
               coalesce(s.timezone, 'America/Los_Angeles') as tz,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles')) as local_now,
               (now() at time zone coalesce(s.timezone, 'America/Los_Angeles'))::date as local_date
        from public.dss_subscribers s
        where public.dss_is_mailable(s)
      ) x
      join public.dss_studies st on st.study_date = x.local_date and st.status = 'approved'
      where extract(hour from x.local_now) between 5 and 7
        and x.created_at < ((x.local_date + time '05:00') at time zone x.tz)
        and not exists (select 1 from public.dss_sends d where d.study_date = x.local_date and d.email = x.email)
      order by x.local_date, x.created_at
      limit greatest(1, least(p_limit, 100))
    ) r
  ), '[]'::json);
end;
$$;
