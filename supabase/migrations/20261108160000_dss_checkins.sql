-- Evening check-in for Premium readers: "How did today go?" at 8 PM their time.
-- Their reply becomes the next morning's "Yesterday, through the lens of Scripture" study.
create table if not exists public.dss_checkins (
  email text not null,
  local_date date not null,
  resend_id text,
  created_at timestamptz not null default now(),
  primary key (email, local_date)
);
alter table public.dss_checkins enable row level security;
revoke all on public.dss_checkins from anon, authenticated;

-- Premium readers at 8:00–10:59 PM local who haven't had tonight's check-in
-- and haven't already shared something for tomorrow's study.
create or replace function public.dss_due_checkins(p_gate text, p_limit integer)
returns json language plpgsql security definer set search_path = '' as $$
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
        where public.dss_is_mailable(s) and s.premium_status in ('founder', 'monthly', 'yearly')
      ) x
      where extract(hour from x.local_now) between 20 and 22
        and not exists (select 1 from public.dss_checkins c where c.email = x.email and c.local_date = x.local_date)
        and not exists (select 1 from public.dss_reflections rf where rf.email = x.email and rf.for_date = x.local_date + 1)
      order by x.email
      limit greatest(1, least(p_limit, 100))
    ) r
  ), '[]'::json);
end;
$$;

-- p_rows: [{"email": "...", "local_date": "YYYY-MM-DD", "resend_id": "..."}]
create or replace function public.dss_record_checkins(p_gate text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_checkins (email, local_date, resend_id)
  select r->>'email', (r->>'local_date')::date, r->>'resend_id' from jsonb_array_elements(p_rows) r
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.dss_due_checkins(text, integer) from public;
grant execute on function public.dss_due_checkins(text, integer) to anon, authenticated, service_role;
revoke all on function public.dss_record_checkins(text, jsonb) from public;
grant execute on function public.dss_record_checkins(text, jsonb) to anon, authenticated, service_role;
