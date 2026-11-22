-- Reads schedule. Read admins (role 'reader', or any account with read_role set) schedule themselves on call,
-- see who is on call, and see the hours they will be paid for. Super read admins see everyone's hours.
-- The read approver approves schedule requests and any pay card hours that differ from the schedule.
do $$ begin
  alter table members drop constraint if exists members_role_check;
  alter table members add constraint members_role_check check (role in ('member', 'admin', 'learner', 'reader'));
end $$;
alter table members add column if not exists read_role text check (read_role in ('reader', 'super'));
alter table members add column if not exists read_approver boolean not null default false;

create table if not exists read_shifts (
  id           bigserial primary key,
  member_id    uuid not null references members(id) on delete cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       text not null default 'requested' check (status in ('requested', 'approved', 'declined', 'canceled', 'replaced')),
  action       text not null default 'add' check (action in ('add', 'change', 'remove')),
  replaces_id  bigint references read_shifts(id) on delete set null,
  note         text,
  requested_by uuid references members(id) on delete set null,
  decided_by   uuid references members(id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '24 hours')
);
create index if not exists read_shifts_time_idx on read_shifts (starts_at, ends_at);
create index if not exists read_shifts_member_idx on read_shifts (member_id, starts_at);

-- Pay card changes: hours added to or taken from a day's scheduled hours, with a reason.
create table if not exists read_adjustments (
  id           bigserial primary key,
  member_id    uuid not null references members(id) on delete cascade,
  work_date    date not null,
  hours        numeric(5,2) not null check (hours <> 0 and hours between -24 and 24),
  reason       text not null,
  status       text not null default 'requested' check (status in ('requested', 'approved', 'declined')),
  requested_by uuid references members(id) on delete set null,
  decided_by   uuid references members(id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists read_adjustments_member_idx on read_adjustments (member_id, work_date);

-- Angela Ramsey (existing admin): super read admin and the approver.
do $$ declare n int; begin
  update members set read_role = 'super', read_approver = true
  where role = 'admin' and (lower(name) like 'angela%ramsey%' or lower(name) like 'anglea%ramsey%');
  get diagnostics n = row_count;
  raise notice '[reads] Angela Ramsey set as super read admin and approver: % account(s)', n;
end $$;

-- Kelly Ray (finance): super read admin with a reads-only account. Her setup link is sent from Reads -> Team.
do $$ declare n int; begin
  insert into members (username, email, name, role, status, read_role)
  values ('kelly.ray', 'Kelly.Ray@labb.com', 'Kelly Ray', 'reader', 'invited', 'super')
  on conflict ((lower(email))) do update set read_role = 'super';
  get diagnostics n = row_count;
  raise notice '[reads] Kelly Ray super read admin: % account(s)', n;
end $$;
