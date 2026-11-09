-- Free Premium for life = Lamplighter. Whenever beta_until becomes 'infinity' (admin edit, Add people,
-- or accepting an application), the person is an accepted Lamplighter; taking it away marks them removed.

alter table public.dss_lamplighters add column if not exists source text not null default 'applied';
alter table public.dss_lamplighters drop constraint if exists dss_lamplighters_source_check;
alter table public.dss_lamplighters add constraint dss_lamplighters_source_check check (source in ('applied', 'admin'));
alter table public.dss_lamplighters drop constraint if exists dss_lamplighters_status_check;
alter table public.dss_lamplighters add constraint dss_lamplighters_status_check
  check (status in ('applied', 'accepted', 'declined', 'removed'));

create or replace function public.dss_sync_lamplighter() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.beta_until = 'infinity'::timestamptz
     and (tg_op = 'INSERT' or old.beta_until is distinct from new.beta_until) then
    insert into public.dss_lamplighters (email, why, status, source, timezone, decided_at)
    values (new.email, null, 'accepted', 'admin', new.timezone, now())
    on conflict (email) do update set status = 'accepted', decided_at = coalesce(public.dss_lamplighters.decided_at, now())
      where public.dss_lamplighters.status <> 'accepted';
  elsif tg_op = 'UPDATE' and old.beta_until = 'infinity'::timestamptz
     and new.beta_until is distinct from 'infinity'::timestamptz then
    update public.dss_lamplighters set status = 'removed', decided_at = now()
      where email = new.email and status = 'accepted';
  end if;
  return new;
end;
$$;

drop trigger if exists dss_sync_lamplighter on public.dss_subscribers;
create trigger dss_sync_lamplighter after insert or update of beta_until on public.dss_subscribers
  for each row execute function public.dss_sync_lamplighter();

-- Backfill: anyone who already has Premium for life becomes a Lamplighter.
insert into public.dss_lamplighters (email, why, status, source, timezone, decided_at)
select s.email, null, 'accepted', 'admin', s.timezone, now()
from public.dss_subscribers s
where s.beta_until = 'infinity'::timestamptz
on conflict (email) do update set status = 'accepted', decided_at = coalesce(public.dss_lamplighters.decided_at, now())
  where public.dss_lamplighters.status <> 'accepted';

-- Lamplighters tab: include where each one came from.
create or replace function public.dss_lamplighter_list(p_gate text)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select l.email, l.why, l.status, l.source, l.timezone, l.created_at, l.decided_at, s.beta_until
      from public.dss_lamplighters l left join public.dss_subscribers s on s.email = l.email
      order by case l.status when 'applied' then 0 when 'accepted' then 1 else 2 end, l.created_at
    ) r
  ), '[]'::json);
end;
$$;

-- Subscribers list: return what's needed for the Type column, and a Lamplighters filter.
create or replace function public.dss_admin_subscribers(p_gate text, p_search text, p_filter text, p_limit integer, p_offset integer)
returns json language plpgsql security definer set search_path = '' as $$
declare v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
  perform public.dss_check_gate(p_gate);
  return json_build_object(
    'total', (
      select count(*) from public.dss_subscribers s
      left join public.dss_lamplighters l on l.email = s.email
      where (v_q is null or s.email like '%' || v_q || '%')
        and case coalesce(p_filter, 'all')
          when 'premium' then public.dss_has_premium(s)
          when 'lamplighters' then l.status = 'accepted'
          when 'free' then not public.dss_has_premium(s)
          when 'unsubscribed' then s.unsubscribed_at is not null
          when 'flagged' then s.suspected_bot or s.email_flag is not null
          else true end
    ),
    'rows', coalesce((
      select json_agg(r) from (
        select s.email, s.created_at, s.plan_interest, s.premium_status, s.timezone, s.source, s.referred_by,
               s.unsubscribed_at, s.suspected_bot, s.email_flag, s.welcomed_at, s.beta_until,
               l.status as lamplighter,
               (select count(*) from public.dss_sends d where d.email = s.email) as studies_received
        from public.dss_subscribers s
        left join public.dss_lamplighters l on l.email = s.email
        where (v_q is null or s.email like '%' || v_q || '%')
          and case coalesce(p_filter, 'all')
            when 'premium' then public.dss_has_premium(s)
            when 'lamplighters' then l.status = 'accepted'
            when 'free' then not public.dss_has_premium(s)
            when 'unsubscribed' then s.unsubscribed_at is not null
            when 'flagged' then s.suspected_bot or s.email_flag is not null
            else true end
        order by s.created_at desc
        limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset)
      ) r
    ), '[]'::json)
  );
end;
$$;
