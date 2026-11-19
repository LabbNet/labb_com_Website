-- First-party page analytics. One row per page view.
-- visitor: random id kept in the browser (localStorage), session: per tab session (sessionStorage).
create table if not exists page_views (
  id          bigserial primary key,
  ts          timestamptz not null default now(),
  path        text not null,
  title       text,
  referrer    text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  visitor     text not null,
  session     text not null,
  member_id   uuid references members(id) on delete set null,
  role        text,
  device      text,
  browser     text,
  os          text,
  region      text,
  duration_ms integer
);
create index if not exists page_views_ts_idx on page_views (ts desc);
create index if not exists page_views_path_ts_idx on page_views (path, ts desc);
create index if not exists page_views_member_idx on page_views (member_id, ts desc) where member_id is not null;
