-- Admin: which of these emails have confirmed (double opt-in), and site-wide counts.
create or replace function public.dss_admin_confirm_status(p_gate text, p_emails text[])
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return json_build_object(
    'confirmed', coalesce((select json_object_agg(email, confirmed_at is not null) from public.dss_subscribers
                           where email = any(p_emails)), '{}'::json),
    'unconfirmed_total', (select count(*) from public.dss_subscribers
                          where confirmed_at is null and unsubscribed_at is null and not suspected_bot)
  );
end;
$$;
revoke all on function public.dss_admin_confirm_status(text, text[]) from public;
grant execute on function public.dss_admin_confirm_status(text, text[]) to anon, authenticated, service_role;
