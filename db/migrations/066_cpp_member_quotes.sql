-- CPP members build and send quotes to their own clients.
alter table sales_quotes add column if not exists member_id uuid references members(id) on delete set null;
alter table sales_quotes add column if not exists payment_mode text not null default 'labb-card';
alter table sales_quotes drop constraint if exists sales_quotes_payment_mode_check;
alter table sales_quotes add constraint sales_quotes_payment_mode_check check (payment_mode in ('labb-card', 'labb-invoice', 'partner'));
alter table sales_quotes add column if not exists service_level text not null default 'sl1';
create index if not exists sales_quotes_member on sales_quotes (member_id) where member_id is not null;
-- The member's own cost for a line (from CPP pricing). Never shown on the quote.
alter table sales_quote_items add column if not exists cost_cents integer;
-- Each quote product points at its CPP price-list item, so members see their cost next to the client price.
alter table quote_price_items add column if not exists cpp_item_id bigint references cpp_price_items(id) on delete set null;
update quote_price_items q set cpp_item_id = c.id from cpp_price_items c
  where q.cpp_item_id is null and c.active and q.sku is not null and lower(c.sku) = lower(q.sku);
update quote_price_items q set cpp_item_id = (select c.id from cpp_price_items c where c.active and lower(regexp_replace(c.name, '[^a-z0-9]', '', 'gi')) = lower(regexp_replace(q.name, '[^a-z0-9]', '', 'gi')) limit 1)
  where q.cpp_item_id is null;
-- Member logo for quotes, stored as a dark grey PNG (data URL).
alter table members add column if not exists logo_png text;
do $mig$ declare n int; m int; begin
  select count(*) filter (where cpp_item_id is not null), count(*) into n, m from quote_price_items where active;
  raise notice '[066] quote products linked to CPP pricing: % of %', n, m;
end $mig$;
