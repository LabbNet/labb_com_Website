-- Reads schedule: shift swaps between read admins, email reminders, and default night coverage.
-- Night hours (9 PM to 7 AM Eastern) belong to the approver (Angela Ramsey) every night unless she changes them.
alter table read_shifts add column if not exists auto_night boolean not null default false;

create table if not exists read_swaps (
  id          bigserial primary key,
  shift_id    bigint not null references read_shifts(id) on delete cascade,
  from_id     uuid not null references members(id) on delete cascade,
  to_id       uuid not null references members(id) on delete cascade,
  note        text,
  status      text not null default 'offered' check (status in ('offered', 'accepted', 'declined', 'canceled')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);
create index if not exists read_swaps_to_idx on read_swaps (to_id, status);

-- Reminder emails already sent: 60, 30 and 5 minutes before a shift, and the 7 AM daily email.
create table if not exists read_notifications (
  shift_id  bigint not null references read_shifts(id) on delete cascade,
  kind      text not null,
  sent_at   timestamptz not null default now(),
  primary key (shift_id, kind)
);
create table if not exists read_daily_emails (
  member_id uuid not null references members(id) on delete cascade,
  day       date not null,
  sent_at   timestamptz not null default now(),
  primary key (member_id, day)
);
-- Nights already given default coverage, so a night Angela removes or reassigns isn't recreated.
create table if not exists read_night_days (day date primary key);
