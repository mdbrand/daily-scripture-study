-- One opt-in (Nov 10 2026): everyone who joins is a Lamplighter. The first N (dss_config.lamplighter_spots)
-- to CONFIRM their email become Founding Lamplighters automatically: Premium free for life. No application, no review.

alter table public.dss_lamplighters drop constraint if exists dss_lamplighters_source_check;
alter table public.dss_lamplighters add constraint dss_lamplighters_source_check check (source in ('applied', 'admin', 'signup'));

-- Called right after a reader confirms their email. Serialized with an advisory lock so the last spot
-- can't be handed out twice. Returns status: granted | already | not_eligible | full | not_found.
create or replace function public.dss_lamplighter_autogrant(p_gate text, p_email text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_status text;
  v_tz text;
  v_number integer;
begin
  perform public.dss_check_gate(p_gate);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('dss_lamplighter_grant'));

  select s.timezone into v_tz from public.dss_subscribers s
    where s.email = v_email and s.confirmed_at is not null and s.unsubscribed_at is null and not s.suspected_bot;
  if not found then return json_build_object('status', 'not_found'); end if;

  select l.status into v_status from public.dss_lamplighters l where l.email = v_email;
  if v_status = 'accepted' then return json_build_object('status', 'already'); end if;
  if v_status in ('declined', 'removed') then return json_build_object('status', 'not_eligible'); end if;
  if not (public.dss_lamplighter_stats()->>'open')::boolean then return json_build_object('status', 'full'); end if;

  insert into public.dss_lamplighters (email, why, status, source, timezone, decided_at)
  values (v_email, null, 'accepted', 'signup', v_tz, now())
  on conflict (email) do update set status = 'accepted', decided_at = now()
    where public.dss_lamplighters.status = 'applied';
  update public.dss_subscribers set beta_until = 'infinity'::timestamptz, updated_at = now() where email = v_email;

  select count(*) into v_number from public.dss_lamplighters where status = 'accepted';
  return json_build_object('status', 'granted', 'number', v_number);
end;
$$;

revoke all on function public.dss_lamplighter_autogrant(text, text) from public;
grant execute on function public.dss_lamplighter_autogrant(text, text) to anon, authenticated, service_role;
