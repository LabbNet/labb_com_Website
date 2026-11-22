-- "Do not send": an admin can block any address from every Labb marketing email (all lists, CPP mailings and
-- guidebook series). Stored as a suppression with audience 'all', with the admin who added it.
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'email_suppressions'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%audience%'
  loop execute format('alter table email_suppressions drop constraint %I', c); end loop;
end $$;
alter table email_suppressions add constraint email_suppressions_audience_check
  check (audience in ('cpp', 'employers', 'clinics', 'treatment', 'corrections', 'newsletter', 'sequences', 'all'));
alter table email_suppressions add column if not exists added_by uuid references members(id) on delete set null;
