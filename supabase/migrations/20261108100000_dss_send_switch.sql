-- Admin switch for daily sending.
create or replace function public.dss_set_send_open(p_gate text, p_open boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_config (key, value) values ('daily_send_open', case when p_open then 'true' else 'false' end)
  on conflict (key) do update set value = excluded.value;
end;
$$;
revoke all on function public.dss_set_send_open(text, boolean) from public;
grant execute on function public.dss_set_send_open(text, boolean) to anon, authenticated, service_role;
