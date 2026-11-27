-- Saved signatures for admins and CPP members, used to countersign a quote's agreement automatically when the client signs.
alter table members add column if not exists signature_png text;
alter table members add column if not exists signature_name text;
alter table members add column if not exists signature_title text;
alter table members add column if not exists signature_at timestamptz;
alter table sales_quotes add column if not exists countersigned_at timestamptz;
alter table sales_quotes add column if not exists countersign_png text;
alter table sales_quotes add column if not exists countersign_name text;
alter table sales_quotes add column if not exists countersign_title text;
alter table sales_quotes add column if not exists countersign_by uuid references members(id) on delete set null;
-- Quote history keeps the 5 most recent versions of each quote.
delete from sales_quote_versions v where v.id not in (
  select id from (select id, row_number() over (partition by quote_id order by created_at desc, id desc) as rn from sales_quote_versions) x where rn <= 5);
