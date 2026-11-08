-- Partner program: remember which partner link brought each signup.
-- First referrer wins: a later signup with a different link never overwrites it.
alter table public.dss_subscribers
  add column if not exists referred_by text check (referred_by is null or referred_by ~ '^[a-z0-9_-]{2,40}$');

create index if not exists dss_subscribers_referred_by_idx on public.dss_subscribers (referred_by) where referred_by is not null;

create or replace function public.dss_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' and old.referred_by is not null then
    new.referred_by = old.referred_by;
  end if;
  return new;
end;
$$;
