-- Daily Scripture Study: email signups (lives in the Mission OS Supabase project).
-- Only the server (service_role) can read or write. The browser never touches this table.
create table if not exists public.dss_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and position('@' in email) > 1),
  plan_interest text not null default 'free' check (plan_interest in ('free', 'premium')),
  status text not null default 'waitlist' check (status in ('waitlist', 'pending', 'active', 'unsubscribed')),
  source text,
  suspected_bot boolean not null default false,
  consent_text text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.dss_subscribers is 'Daily Scripture Study signups. plan_interest = which edition they picked at signup; no payment is taken yet.';

create index if not exists dss_subscribers_created_at_idx on public.dss_subscribers (created_at desc);

create or replace function public.dss_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dss_subscribers_touch on public.dss_subscribers;
create trigger dss_subscribers_touch before update on public.dss_subscribers
  for each row execute function public.dss_touch_updated_at();

alter table public.dss_subscribers enable row level security;
revoke all on public.dss_subscribers from anon, authenticated;
grant select, insert, update, delete on public.dss_subscribers to service_role;
