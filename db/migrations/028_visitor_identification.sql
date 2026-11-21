-- Visitor identification: which company a visit came from (IP lookup), and which lead a browser belongs to.

-- Company behind an IP address, cached. The IP itself is not stored, only a keyed hash.
create table if not exists ip_orgs (
  ip_hash     text primary key,
  name        text,
  domain      text,
  kind        text,          -- business, isp, hosting, education, government or unknown
  city        text,
  region      text,
  country     text,
  looked_up_at timestamptz not null default now()
);

alter table page_views add column if not exists org text;
alter table page_views add column if not exists org_domain text;
alter table page_views add column if not exists org_kind text;
alter table page_views add column if not exists ip_hash text;
create index if not exists page_views_org_idx on page_views (org_domain, ts) where org_domain is not null;
create index if not exists page_views_visitor_idx on page_views (visitor, ts);

-- A browser (visitor id) linked to a person, when they submit a form or click a link in a Labb email.
create table if not exists visitor_links (
  visitor     text not null,
  email       text not null,
  lead_id     bigint references leads(id) on delete set null,
  source      text not null,  -- form or email
  created_at  timestamptz not null default now(),
  primary key (visitor, email)
);
create index if not exists visitor_links_lead_idx on visitor_links (lead_id);
create index if not exists visitor_links_email_idx on visitor_links (lower(email));
