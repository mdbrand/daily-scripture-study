-- Daily study sending: stored studies, a send log, welcome tracking, and unsubscribe.

alter table public.dss_subscribers
  add column if not exists unsub_token uuid not null default gen_random_uuid(),
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists welcomed_at timestamptz;
create unique index if not exists dss_subscribers_unsub_token on public.dss_subscribers (unsub_token);

create table if not exists public.dss_studies (
  study_date date primary key,
  status text not null default 'approved' check (status in ('approved', 'held', 'sent')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  sent_count integer not null default 0
);
alter table public.dss_studies enable row level security;
revoke all on public.dss_studies from anon, authenticated;

create table if not exists public.dss_sends (
  study_date date not null,
  email text not null,
  resend_id text,
  created_at timestamptz not null default now(),
  primary key (study_date, email)
);
alter table public.dss_sends enable row level security;
revoke all on public.dss_sends from anon, authenticated;

-- Master switch: nothing is emailed to subscribers until this is 'true'.
insert into public.dss_config (key, value) values ('daily_send_open', 'false') on conflict (key) do nothing;

-- Who gets mail: not unsubscribed, not flagged as a bot.
create or replace function public.dss_is_mailable(s public.dss_subscribers) returns boolean
language sql immutable set search_path = '' as $$
  select s.unsubscribed_at is null and not s.suspected_bot;
$$;

create or replace function public.dss_daily_settings(p_gate text)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return json_build_object(
    'send_open', coalesce((select value from public.dss_config where key = 'daily_send_open'), 'false') = 'true',
    'mailable', (select count(*) from public.dss_subscribers s where public.dss_is_mailable(s))
  );
end;
$$;

create or replace function public.dss_study_upsert(p_gate text, p_date date, p_content jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_studies (study_date, content) values (p_date, p_content)
  on conflict (study_date) do update set content = excluded.content, updated_at = now()
    where public.dss_studies.status <> 'sent';
end;
$$;

create or replace function public.dss_study_get(p_gate text, p_date date)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return (select row_to_json(s) from public.dss_studies s where study_date = p_date);
end;
$$;

create or replace function public.dss_study_set_status(p_gate text, p_date date, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  if p_status not in ('approved', 'held') then raise exception 'bad status'; end if;
  update public.dss_studies set status = p_status, updated_at = now() where study_date = p_date and status <> 'sent';
end;
$$;

-- Recent studies, newest first (admin list + "don't repeat these" for the writer).
create or replace function public.dss_study_list(p_gate text, p_limit integer)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select study_date, status, sent_count, sent_at,
             content->>'title' as title, content->'passage'->>'ref' as ref, content->>'pillar' as pillar
      from public.dss_studies order by study_date desc limit greatest(1, least(p_limit, 400))
    ) r
  ), '[]'::json);
end;
$$;

-- Next batch of people who haven't received this date's study yet.
create or replace function public.dss_daily_recipients(p_gate text, p_date date, p_limit integer)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select s.email, s.unsub_token,
             coalesce(s.premium_status in ('founder', 'monthly', 'yearly'), false) as premium
      from public.dss_subscribers s
      where public.dss_is_mailable(s)
        and not exists (select 1 from public.dss_sends d where d.study_date = p_date and d.email = s.email)
      order by s.created_at
      limit greatest(1, least(p_limit, 100))
    ) r
  ), '[]'::json);
end;
$$;

-- p_rows: [{"email": "...", "resend_id": "..."}]
create or replace function public.dss_record_sends(p_gate text, p_date date, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform public.dss_check_gate(p_gate);
  insert into public.dss_sends (study_date, email, resend_id)
  select p_date, r->>'email', r->>'resend_id' from jsonb_array_elements(p_rows) r
  on conflict do nothing;
  get diagnostics n = row_count;
  update public.dss_studies set sent_count = (select count(*) from public.dss_sends where study_date = p_date)
    where study_date = p_date;
  return n;
end;
$$;

create or replace function public.dss_study_mark_sent(p_gate text, p_date date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  update public.dss_studies set status = 'sent', sent_at = coalesce(sent_at, now()), updated_at = now()
    where study_date = p_date;
end;
$$;

-- Welcome emails: people who joined but haven't been welcomed (only used once sending is open).
create or replace function public.dss_welcome_pending(p_gate text, p_limit integer)
returns json language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  return coalesce((
    select json_agg(r) from (
      select s.email, s.unsub_token,
             coalesce(s.premium_status in ('founder', 'monthly', 'yearly'), false) as premium
      from public.dss_subscribers s
      where public.dss_is_mailable(s) and s.welcomed_at is null
      order by s.created_at limit greatest(1, least(p_limit, 100))
    ) r
  ), '[]'::json);
end;
$$;

create or replace function public.dss_mark_welcomed(p_gate text, p_emails text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.dss_check_gate(p_gate);
  update public.dss_subscribers set welcomed_at = now(), updated_at = now()
    where email = any(p_emails) and welcomed_at is null;
end;
$$;

-- Public: the unsubscribe token is the secret. Returns the masked email for the confirmation page.
create or replace function public.dss_unsubscribe(p_token uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  update public.dss_subscribers set unsubscribed_at = coalesce(unsubscribed_at, now()), updated_at = now()
    where unsub_token = p_token returning email into v_email;
  if v_email is null then return json_build_object('ok', false); end if;
  return json_build_object('ok', true, 'email', regexp_replace(v_email, '^(.).*(@.*)$', '\1•••\2'));
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'dss_daily_settings(text)', 'dss_study_upsert(text, date, jsonb)', 'dss_study_get(text, date)',
    'dss_study_set_status(text, date, text)', 'dss_study_list(text, integer)',
    'dss_daily_recipients(text, date, integer)', 'dss_record_sends(text, date, jsonb)',
    'dss_study_mark_sent(text, date)', 'dss_welcome_pending(text, integer)',
    'dss_mark_welcomed(text, text[])', 'dss_unsubscribe(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated, service_role', f);
  end loop;
  revoke all on function public.dss_is_mailable(public.dss_subscribers) from public, anon, authenticated;
end $$;
