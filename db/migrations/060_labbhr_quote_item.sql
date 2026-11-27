-- LabbHR subscription on the quote price list. No price yet: the rep enters it on the quote, or it's set in Quote prices.
insert into quote_price_items (category, name, description, unit, under100_cents, over100_cents, sort)
select 'saas', 'LabbHR subscription', 'LabbHR workplace screening platform', 'month', null, null, 20
where not exists (select 1 from quote_price_items where lower(name) = 'labbhr subscription');
