-- Expected monthly testing volume per quote line, for Labb's product forecasting.
alter table member_quote_items add column if not exists monthly_volume integer check (monthly_volume is null or monthly_volume >= 0);
