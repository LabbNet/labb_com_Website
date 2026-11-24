-- Sales meetings by stage (initial discussion, demo, close/quote) and the likely-duplicate review queue.
alter table lead_meetings add column if not exists kind text not null default 'discussion';
alter table lead_meetings add column if not exists outcome text;
alter table lead_meetings add column if not exists scheduled_by uuid references members(id) on delete set null;
alter table lead_meetings add column if not exists done_at timestamptz;
alter table lead_meetings drop constraint if exists lead_meetings_kind_check;
alter table lead_meetings add constraint lead_meetings_kind_check check (kind in ('discussion', 'demo', 'close'));
alter table lead_meetings drop constraint if exists lead_meetings_status_check;
alter table lead_meetings add constraint lead_meetings_status_check check (status in ('booked', 'cancelled', 'completed', 'no-show'));

create extension if not exists pg_trgm;
do $$ begin
  create extension if not exists fuzzystrmatch;
exception when others then
  raise notice '[048] fuzzystrmatch not available; sound-alike name matching is off';
end $$;

-- Leads from people who are already Labb clients: hidden from the working list, shown under the Existing clients filter.
alter table leads add column if not exists existing_client boolean not null default false;
create index if not exists leads_existing_client on leads (existing_client) where existing_client;

-- Pairs of leads that look like the same person or organization but don't share an email.
create table if not exists lead_dupe_flags (
  id         bigserial primary key,
  lead_a     bigint not null references leads(id) on delete cascade,
  lead_b     bigint not null references leads(id) on delete cascade,
  score      int not null,
  reasons    text[] not null default '{}',
  status     text not null default 'open' check (status in ('open', 'dismissed')),
  decided_by uuid references members(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (lead_a < lead_b),
  unique (lead_a, lead_b)
);
create index if not exists lead_dupe_flags_open on lead_dupe_flags (status) where status = 'open';

-- Track opens and clicks on meeting invites.
alter table email_events add column if not exists lead_meeting bigint references lead_meetings(id) on delete set null;
create index if not exists email_events_meeting on email_events (lead_meeting) where lead_meeting is not null;
