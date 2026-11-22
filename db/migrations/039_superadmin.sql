-- One superadmin (James Ramsey): the highest level. Only the superadmin sees both the Labb admin portal and the
-- reads schedule by default, and only the superadmin grants anyone access to both (dual access).
alter table members add column if not exists superadmin boolean not null default false;
do $$ declare n int; begin
  update members set superadmin = true
  where role = 'admin' and (lower(email) = 'james@labb.com' or lower(name) like 'james%ramsey%');
  get diagnostics n = row_count;
  raise notice '[access] superadmin set on % account(s)', n;
end $$;
create unique index if not exists members_one_superadmin on members (superadmin) where superadmin;
