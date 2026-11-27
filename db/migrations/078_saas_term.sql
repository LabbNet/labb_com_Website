-- Labb clinic quotes: the client picks SaaS billing. Quarterly is 5% off, yearly 15% off, paid up front for the period.
alter table sales_quotes add column if not exists saas_term text not null default 'monthly';
alter table sales_quotes drop constraint if exists sales_quotes_saas_term_check;
alter table sales_quotes add constraint sales_quotes_saas_term_check check (saas_term in ('monthly', 'quarterly', 'yearly'));
