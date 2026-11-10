-- Admin: everything needed to send one reader a given day's email again (with their Last Night's Lamp, if ready).
-- Does not record a send; the original send stays on file.
create or replace function public.dss_resend_info(p_gate text, p_email text, p_date date)
returns json
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_email text := lower(trim(p_email));
  s public.dss_subscribers;
  v_yesterday json;
begin
  perform public.dss_check_gate(p_gate);
  select * into s from public.dss_subscribers where email = v_email;
  if s.id is null then return json_build_object('status', 'not_found'); end if;
  if not public.dss_is_mailable(s) then return json_build_object('status', 'not_mailable'); end if;
  if public.dss_has_premium(s) then
    select json_build_object('reply', rf.reply, 'passage', rf.content->'passage', 'body', rf.content->'body', 'voice', rf.content->'voice')
      into v_yesterday
      from public.dss_reflections rf
      where rf.email = v_email and rf.for_date = p_date and rf.status = 'ready';
  end if;
  return json_build_object('status', 'ok', 'email', v_email, 'unsub_token', s.unsub_token,
    'premium', public.dss_has_premium(s), 'yesterday', v_yesterday);
end;
$$;

revoke all on function public.dss_resend_info(text, text, date) from public;
grant execute on function public.dss_resend_info(text, text, date) to anon, authenticated, service_role;
