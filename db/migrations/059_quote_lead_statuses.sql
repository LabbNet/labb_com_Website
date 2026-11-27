-- Two more lead statuses: Quote requested and Quote sent.
alter table leads drop constraint if exists leads_status_check;
alter table leads add constraint leads_status_check check (status in ('new', 'contacted', 'qualified', 'quote-requested', 'quote-sent', 'won', 'lost', 'existing-client', 'not-qualified'));
-- Leads that already have a sent (not yet signed) quote and haven't moved past qualified.
update leads l set status = 'quote-sent' where l.status in ('new', 'contacted', 'qualified')
  and exists (select 1 from sales_quotes q where q.lead_id = l.id and q.status in ('sent', 'viewed'));
do $mig$ declare r record; begin
  for r in select category, count(*) filter (where active) n from quote_price_items group by 1 order by 1 loop
    raise notice '[059] quote price list: % active in %', r.n, r.category;
  end loop;
end $mig$;
