-- LabbHR Finance Bundle: $199/mo add-on to the LabbHR subscription, listed right after it.
insert into quote_price_items (category, name, description, unit, under100_cents, over100_cents, sort)
select 'saas', 'LabbHR Finance Bundle', 'Add-on to the LabbHR subscription', 'month', 19900, 19900,
  coalesce((select sort from quote_price_items where lower(name) = 'labbhr subscription' limit 1), 20) + 1
where not exists (select 1 from quote_price_items where lower(name) = 'labbhr finance bundle');
