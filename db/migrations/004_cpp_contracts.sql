-- CPP program record per member: start date and program status (separate from the login account status).
alter table members add column if not exists cpp_start_date date;
alter table members add column if not exists cpp_status text not null default 'active';
do $$ begin
  alter table members add constraint members_cpp_status_check check (cpp_status in ('active', 'inactive'));
exception when duplicate_object then null; end $$;
alter table members add column if not exists cpp_status_changed_at timestamptz;

-- Signed CPP contracts. Files are stored in the database so they survive redeploys.
create table if not exists member_contracts (
  id            bigserial primary key,
  member_id     uuid not null references members(id) on delete cascade,
  filename      text not null,
  content_type  text not null,
  size_bytes    integer not null,
  data          bytea not null,
  note          text,
  uploaded_by   uuid references members(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);
create index if not exists member_contracts_member_idx on member_contracts (member_id, uploaded_at desc);
