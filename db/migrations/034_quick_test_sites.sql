-- Quick Test site finder: clinics with a street address are offered to in-clinic buyers. Admins can hide a site.
alter table contact_imports add column if not exists qt_hidden boolean not null default false;
