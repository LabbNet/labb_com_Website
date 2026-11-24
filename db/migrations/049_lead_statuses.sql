-- Two more lead statuses: Existing client and Not qualified. Existing client matches the existing_client tag.
alter table leads drop constraint if exists leads_status_check;
alter table leads add constraint leads_status_check check (status in ('new', 'contacted', 'qualified', 'won', 'lost', 'existing-client', 'not-qualified'));
update leads set status = 'existing-client' where existing_client and status <> 'existing-client';
