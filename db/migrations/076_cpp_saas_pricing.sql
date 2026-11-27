-- CPP pricing: Labb Station $10/mo per location; LabbHR $40/mo per location for employers who self test.
-- Linked to the quote products so CPP members see these as their cost on their quotes.
do $mig$
declare ls bigint; hr bigint; n int;
begin
  select id into ls from cpp_price_items where active and category = 'saas' and (sku = 'LS-SAAS' or lower(name) like 'labb station%') order by (sku = 'LS-SAAS') desc nulls last, id limit 1;
  if ls is null then
    insert into cpp_price_items (category, name, sku, description, unit, sl1_cents, sl3_cents, sort)
    values ('saas', 'Labb Station', 'LS-SAAS', 'Digital reader platform subscription', 'per location per month', 1000, 1000, 10) returning id into ls;
  else
    update cpp_price_items set sl1_cents = 1000, sl3_cents = 1000, unit = 'per location per month', updated_at = now() where id = ls;
  end if;
  select id into hr from cpp_price_items where sku = 'LHR-SELF' limit 1;
  if hr is null then
    insert into cpp_price_items (category, name, sku, description, unit, sl1_cents, sl3_cents, notes, sort)
    values ('saas', 'LabbHR for employers who self test', 'LHR-SELF', 'LabbHR platform subscription for an employer running its own testing', 'per location per month', 4000, 4000, 'Employers who self test', 20) returning id into hr;
  else
    update cpp_price_items set sl1_cents = 4000, sl3_cents = 4000, active = true, updated_at = now() where id = hr;
  end if;
  update quote_price_items set cpp_item_id = ls where lower(name) = 'labb station subscription';
  update quote_price_items set cpp_item_id = hr where lower(name) = 'labbhr subscription';
  select count(*) into n from cpp_price_items where active and category = 'saas';
  raise notice '[076] CPP SaaS pricing: Labb Station item %, LabbHR self-test item %, % active SaaS items', ls, hr, n;
end $mig$;
