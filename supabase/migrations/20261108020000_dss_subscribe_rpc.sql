-- Signup without a secret key: the public (publishable) key may call ONLY this function.
-- It can add or update one signup and returns nothing, so the public key still cannot read the table.
create or replace function public.dss_subscribe(
  p_email text,
  p_plan text default 'free',
  p_source text default null,
  p_ref text default null,
  p_suspected_bot boolean default false,
  p_consent text default null,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_ref text := lower(trim(coalesce(p_ref, '')));
begin
  if v_email is null or length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if v_ref !~ '^[a-z0-9_-]{2,40}$' then
    v_ref := null;
  end if;

  insert into public.dss_subscribers (email, plan_interest, source, referred_by, suspected_bot, consent_text, user_agent)
  values (
    v_email,
    case when p_plan = 'premium' then 'premium' else 'free' end,
    left(p_source, 40),
    v_ref,
    coalesce(p_suspected_bot, false),
    left(p_consent, 500),
    left(p_user_agent, 300)
  )
  on conflict (email) do update set
    plan_interest = excluded.plan_interest,
    source = coalesce(excluded.source, public.dss_subscribers.source),
    referred_by = coalesce(public.dss_subscribers.referred_by, excluded.referred_by),
    suspected_bot = excluded.suspected_bot,
    consent_text = excluded.consent_text,
    user_agent = excluded.user_agent;
end;
$$;

revoke all on function public.dss_subscribe(text, text, text, text, boolean, text, text) from public;
grant execute on function public.dss_subscribe(text, text, text, text, boolean, text, text) to anon, authenticated, service_role;
