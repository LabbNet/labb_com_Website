-- CPP members ask Labb to run quality control on a rapid test lot so its expiration can be extended.
create table if not exists shelf_life_requests (
  id            bigserial primary key,
  member_id     uuid not null references members(id) on delete cascade,
  kit           text not null,
  lot_number    text not null,
  printed_exp   date not null,
  quantity      text,
  need_by       date,
  notes         text,
  status        text not null default 'requested',
  admin_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists shelf_life_requests_member_idx on shelf_life_requests (member_id, created_at desc);
create index if not exists shelf_life_requests_status_idx on shelf_life_requests (status, created_at desc);
