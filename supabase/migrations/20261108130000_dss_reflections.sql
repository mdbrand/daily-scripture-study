-- Premium "Yesterday, through the lens of Scripture": a reader's reply about their day,
-- and the passage + reflection written for it, shown in their next morning's email.
create table if not exists public.dss_reflections (
  email text not null,
  for_date date not null,
  reply text not null,
  content jsonb,
  status text not null default 'pending' check (status in ('pending', 'ready', 'skipped', 'failed')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (email, for_date)
);
alter table public.dss_reflections enable row level security;
revoke all on public.dss_reflections from anon, authenticated;

-- Who sent a reply: Premium? which time zone? (for picking the reflection's date)
create or replace function public.dss_reader_lookup(p_gate text, p_email text)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return (
    select json_build_object(
      'premium', coalesce(s.premium_status in ('founder', 'monthly', 'yearly'), false),
      'timezone', coalesce(s.timezone, 'America/Los_Angeles'),
      'mailable', public.dss_is_mailable(s),
      -- The date of the next study this reader will get: today if it's before 5 AM their time, else tomorrow.
      'next_date', case
        when extract(hour from now() at time zone coalesce(s.timezone, 'America/Los_Angeles')) < 5
          then (now() at time zone coalesce(s.timezone, 'America/Los_Angeles'))::date
        else (now() at time zone coalesce(s.timezone, 'America/Los_Angeles'))::date + 1 end
    )
    from public.dss_subscribers s where s.email = lower(trim(p_email))
  );
end;
$$;

-- Save a reply (several replies the same day are joined), or the finished reflection.
create or replace function public.dss_reflection_save(
  p_gate text, p_email text, p_for_date date, p_reply text, p_content jsonb, p_status text, p_note text
) returns text language plpgsql security definer set search_path = '' as $$
declare v_reply text;
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_reflections (email, for_date, reply, content, status, note)
  values (lower(trim(p_email)), p_for_date, left(p_reply, 4000), p_content, p_status, p_note)
  on conflict (email, for_date) do update set
    reply = case when p_content is null and public.dss_reflections.reply <> excluded.reply
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

-- Due recipients now also carry the Premium reader's reflection for that date, if one is ready.
create or replace function public.dss_due_recipients(p_gate text, p_limit integer)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select x.email, x.unsub_token, x.premium, x.local_date as study_date,
             case when x.premium then (
               select json_build_object('reply', rf.reply, 'passage', rf.content->'passage', 'body', rf.content->'body')
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

revoke all on function public.dss_reader_lookup(text, text) from public;
grant execute on function public.dss_reader_lookup(text, text) to anon, authenticated, service_role;
revoke all on function public.dss_reflection_save(text, text, date, text, jsonb, text, text) from public;
grant execute on function public.dss_reflection_save(text, text, date, text, jsonb, text, text) to anon, authenticated, service_role;
