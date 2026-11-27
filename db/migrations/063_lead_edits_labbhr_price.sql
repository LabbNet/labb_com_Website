-- Leads can change quantities of every priced one-time item; never software, included items or lab and MRO.
update sales_quote_items set adjustable = (billing = 'once' and unit_cents > 0) where adjustable is distinct from (billing = 'once' and unit_cents > 0);
-- LabbHR subscription: $399/mo.
update quote_price_items set under100_cents = 39900, over100_cents = 39900, updated_at = now() where lower(name) = 'labbhr subscription';
update sales_quote_items i set unit_cents = 39900 from quote_price_items p where p.id = i.price_item_id and lower(p.name) = 'labbhr subscription' and i.unit_cents = 0;
