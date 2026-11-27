-- Admin calendar: day-by-day blocked times per team member, meeting platform, silent meetings and the 10 minute reminder.
create table if not exists host_blocks (
  id          bigserial primary key,
  host_id     uuid not null references members(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null check (ends_at > starts_at),
  note        text,
  created_by  uuid references members(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists host_blocks_host on host_blocks (host_id, starts_at);
alter table lead_meetings add column if not exists platform text not null default 'teams';
alter table lead_meetings add column if not exists notify_lead boolean not null default true;
alter table lead_meetings add column if not exists reminded10 boolean not null default false;
-- Meetings already within 10 minutes when this ships don't get a late reminder.
update lead_meetings set reminded10 = true where starts_at < now() + interval '11 minutes';
