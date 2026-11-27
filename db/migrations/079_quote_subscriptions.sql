-- Card-paid quotes with software become a Stripe subscription that renews monthly, quarterly or yearly.
alter table sales_quotes add column if not exists stripe_subscription text;
alter table sales_quotes add column if not exists stripe_customer text;
alter table sales_quotes add column if not exists subscription_status text;
create index if not exists sales_quotes_sub on sales_quotes (stripe_subscription) where stripe_subscription is not null;
