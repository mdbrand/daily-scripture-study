-- Founders is now an open offer (no cap). The current price lives in dss_config and can be changed
-- anytime (e.g. 3700 -> 6700) without a deploy:
--   update public.dss_config set value = '6700' where key = 'founders_price_cents';
insert into public.dss_config (key, value) values ('founders_price_cents', '3700')
on conflict (key) do nothing;

create or replace function public.dss_founders_stats()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'sold', (select count(*) from public.dss_founders where status = 'paid'),
    'price_cents', coalesce((select value::integer from public.dss_config where key = 'founders_price_cents'), 3700)
  );
$$;
revoke all on function public.dss_founders_stats() from public;
grant execute on function public.dss_founders_stats() to anon, authenticated, service_role;

-- tier is now just a price label: 1 = $37 founders price, 2 = any higher price.
