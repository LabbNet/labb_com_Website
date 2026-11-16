-- CPP member requests for sponsored trade show materials (brochures, banner stands, other items).
create table if not exists trade_show_requests (
  id            bigserial primary key,
  member_id     uuid not null references members(id) on delete cascade,
  show_name     text not null,
  show_city     text not null,
  show_state    text not null,
  venue         text,
  show_url      text,
  start_date    date not null,
  end_date      date,
  brochures     integer not null default 0,
  banner_stands boolean not null default false,
  other_items   text,
  ship_name     text,
  ship_line1    text,
  ship_line2    text,
  ship_city     text,
  ship_state    text,
  ship_zip      text,
  need_by       date,
  notes         text,
  status        text not null default 'requested' check (status in ('requested', 'approved', 'shipped', 'declined')),
  admin_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists trade_show_requests_member_idx on trade_show_requests (member_id, created_at desc);
create index if not exists trade_show_requests_status_idx on trade_show_requests (status, start_date);
