-- Online sale price per kit, and a link to the product's details page.
alter table cpp_price_items add column if not exists online_cents integer;
alter table cpp_price_items add column if not exists product_path text;
