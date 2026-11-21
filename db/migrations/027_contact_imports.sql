-- Opt-in contacts imported from HubSpot, Labb Station or another source. They wait in a pending list
-- until an admin puts each one on a newsletter list. Adds the treatment center and corrections lists.
create table if not exists contact_imports (
  id           bigserial primary key,
  email        text not null,
  first_name   text,
  last_name    text,
  company      text,
  address      text,
  address2     text,
  city         text,
  state        text,
  zip          text,
  phone        text,
  source       text not null default 'other',
  batch        text,
  list         text check (list in ('employers', 'clinics', 'treatment', 'corrections')),
  status       text not null default 'pending' check (status in ('pending', 'assigned', 'ignored')),
  assigned_by  uuid references members(id) on delete set null,
  assigned_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists contact_imports_email on contact_imports (lower(email));
create index if not exists contact_imports_status on contact_imports (status, lower(company));

do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'email_campaigns'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%audience%'
  loop execute format('alter table email_campaigns drop constraint %I', c); end loop;
  for c in select conname from pg_constraint where conrelid = 'email_suppressions'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%audience%'
  loop execute format('alter table email_suppressions drop constraint %I', c); end loop;
end $$;
alter table email_campaigns add constraint email_campaigns_audience_check check (audience in ('cpp', 'employers', 'clinics', 'treatment', 'corrections', 'newsletter'));
alter table email_suppressions add constraint email_suppressions_audience_check check (audience in ('cpp', 'employers', 'clinics', 'treatment', 'corrections', 'newsletter', 'sequences'));
