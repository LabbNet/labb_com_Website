-- Rapid tests are sold in boxes of 25. Quote quantities for kits are now boxes (price stays per test).
-- Convert kit quantities on open quotes from tests to boxes, rounding up.
update sales_quote_items i set qty = ceil(i.qty / 25.0)::int, min_qty = ceil(i.min_qty / 25.0)::int, unit = 'test'
from sales_quotes q
where q.id = i.quote_id and q.status in ('draft', 'sent', 'viewed')
  and coalesce(i.category, (select p.category from quote_price_items p where p.id = i.price_item_id)) = 'rapid-kits';
update sales_quote_items i set category = 'rapid-kits' from quote_price_items p where p.id = i.price_item_id and p.category = 'rapid-kits' and i.category is null;
