-- Three newsletter lists: CPP members, employers and clinics. 'newsletter' stays for older campaigns and unsubscribes.
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'email_campaigns'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%audience%'
  loop execute format('alter table email_campaigns drop constraint %I', c); end loop;
  for c in select conname from pg_constraint where conrelid = 'email_suppressions'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%audience%'
  loop execute format('alter table email_suppressions drop constraint %I', c); end loop;
end $$;
alter table email_campaigns add constraint email_campaigns_audience_check check (audience in ('cpp', 'employers', 'clinics', 'newsletter'));
alter table email_suppressions add constraint email_suppressions_audience_check check (audience in ('cpp', 'employers', 'clinics', 'newsletter'));
