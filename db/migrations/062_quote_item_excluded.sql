-- Removing a line from a quote now keeps it (with its price) on the quote, marked excluded, so it can be brought back later.
alter table sales_quote_items add column if not exists excluded boolean not null default false;
