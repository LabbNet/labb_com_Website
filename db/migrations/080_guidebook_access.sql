-- Guidebook links emailed from labb.com/guidebooks: each link opens the guidebooks the visitor asked for.
create table if not exists guidebook_access (
  token       text primary key,
  lead_id     bigint references leads(id) on delete set null,
  email       text not null,
  audience    text not null,
  slugs       text[] not null,
  views       integer not null default 0,
  created_at  timestamptz not null default now(),
  last_viewed_at timestamptz
);
