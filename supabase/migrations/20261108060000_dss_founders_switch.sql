-- Founders is a behind-the-scenes offer: off by default. Turn it on/off without a deploy:
--   update public.dss_config set value = 'true'  where key = 'founders_open';   -- show + sell
--   update public.dss_config set value = 'false' where key = 'founders_open';   -- hide
insert into public.dss_config (key, value) values ('founders_open', 'false')
on conflict (key) do nothing;

create or replace function public.dss_founders_stats()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'sold', (select count(*) from public.dss_founders where status = 'paid'),
    'price_cents', coalesce((select value::integer from public.dss_config where key = 'founders_price_cents'), 3700),
    'open', coalesce((select value = 'true' from public.dss_config where key = 'founders_open'), false)
  );
$$;
revoke all on function public.dss_founders_stats() from public;
grant execute on function public.dss_founders_stats() to anon, authenticated, service_role;
