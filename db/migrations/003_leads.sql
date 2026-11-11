-- Website leads. Every lead is stored permanently: rows are archived, reassigned or passed back,
-- never deleted. lead_events keeps the full history of ownership, status and notes.
create table if not exists leads (
  id            bigserial primary key,
  type          text not null,
  segment       text not null default 'other',
  products      text,
  first_name    text,
  last_name     text,
  email         text not null,
  phone         text,
  company       text,
  city          text,
  state         text,
  industry      text,
  volume        text,
  interest      text,
  message       text,
  resource      text,
  page          text,
  referrer      text,
  utm           jsonb,
  data          jsonb not null default '{}'::jsonb,
  owner         text not null default 'labb' check (owner in ('labb', 'partner')),
  partner_id    uuid references members(id) on delete set null,
  passed_at     timestamptz,
  passed_by     uuid references members(id) on delete set null,
  status        text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  archived      boolean not null default false,
  notified      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists leads_created_idx on leads (created_at desc);
create index if not exists leads_segment_idx on leads (segment);
create index if not exists leads_status_idx on leads (status);
create index if not exists leads_partner_idx on leads (partner_id);

create table if not exists lead_events (
  id          bigserial primary key,
  lead_id     bigint not null references leads(id) on delete restrict,
  actor_id    uuid references members(id) on delete set null,
  actor_name  text,
  event       text not null,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists lead_events_lead_idx on lead_events (lead_id, created_at);

-- Admin-editable site settings (for example the lead notification address).
create table if not exists site_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references members(id) on delete set null
);
