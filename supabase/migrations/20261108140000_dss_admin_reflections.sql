create or replace function public.dss_admin_reflections(p_gate text, p_limit integer)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select email, for_date, reply, status, note, content->'passage'->>'ref' as ref, updated_at
      from public.dss_reflections order by updated_at desc limit greatest(1, least(p_limit, 200))
    ) r
  ), '[]'::json);
end;
$$;
revoke all on function public.dss_admin_reflections(text, integer) from public;
grant execute on function public.dss_admin_reflections(text, integer) to anon, authenticated, service_role;
