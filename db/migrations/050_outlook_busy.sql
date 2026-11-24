-- Outlook (or any calendar) busy times for each Labb team member, read from their published calendar link.
alter table members add column if not exists busy_ics_url text;
alter table members add column if not exists busy_synced_at timestamptz;
alter table members add column if not exists busy_error text;
create table if not exists host_busy (
  host_id   uuid not null references members(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at   timestamptz not null
);
create index if not exists host_busy_host on host_busy (host_id, starts_at);
