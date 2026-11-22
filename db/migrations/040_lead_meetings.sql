-- Lead acceptance and Labb lead meetings.
-- A CPP member accepts a lead passed to them (the prospect is told to expect their email).
-- When Labb keeps a lead, an admin accepts it for a Labb team member (or "any available") and the prospect
-- gets a link to book a video call from that team member's weekly meeting hours.
alter table leads add column if not exists accepted_at timestamptz;
alter table leads add column if not exists accepted_by uuid references members(id) on delete set null;
alter table leads add column if not exists meeting_host uuid references members(id) on delete set null;
alter table leads add column if not exists book_token text;
create unique index if not exists leads_book_token on leads (book_token) where book_token is not null;

-- Personal video room link (Zoom, Teams or Google Meet). When empty, each meeting gets its own room.
alter table members add column if not exists meeting_url text;

-- Weekly meeting hours per Labb team member, in Eastern time (minutes after midnight).
create table if not exists meeting_hours (
  id bigserial primary key,
  member_id uuid not null references members(id) on delete cascade,
  dow smallint not null check (dow between 0 and 6),
  start_min smallint not null check (start_min between 0 and 1440),
  end_min smallint not null check (end_min between 0 and 1440),
  check (end_min > start_min)
);
create index if not exists meeting_hours_member on meeting_hours (member_id);

create table if not exists lead_meetings (
  id bigserial primary key,
  lead_id bigint not null references leads(id) on delete cascade,
  host_id uuid not null references members(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  room_url text not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  notes text,
  reminded boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists lead_meetings_slot on lead_meetings (host_id, starts_at) where status = 'booked';
create index if not exists lead_meetings_lead on lead_meetings (lead_id);
