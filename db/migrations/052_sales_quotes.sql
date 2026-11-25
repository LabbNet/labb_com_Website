-- Labb sales quotes: HTML templates, quotes per lead with line items, AI edit history, e-signature and payment.
create table if not exists quote_templates (
  id          bigserial primary key,
  name        text not null,
  kind        text not null default 'any' check (kind in ('any', 'clinic', 'employer', 'custom')),
  html        text not null,
  notes       text,
  active      boolean not null default true,
  created_by  uuid references members(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists sales_quotes (
  id              bigserial primary key,
  lead_id         bigint not null references leads(id) on delete cascade,
  kind            text not null check (kind in ('clinic', 'employer', 'custom')),
  title           text not null,
  status          text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'signed', 'paid', 'declined', 'expired')),
  template_id     bigint references quote_templates(id) on delete set null,
  html            text not null,
  price_level     text not null default 'msrp1',
  rep_id          uuid references members(id) on delete set null,
  created_by      uuid references members(id) on delete set null,
  token           text not null unique,
  expires_on      date not null default (current_date + 30),
  notes           text,
  sent_at         timestamptz,
  approved_by     uuid references members(id) on delete set null,
  first_opened_at timestamptz,
  last_opened_at  timestamptz,
  open_count      integer not null default 0,
  signed_at       timestamptz,
  signed_name     text,
  signed_title    text,
  signature_png   text,
  signed_ip       text,
  signed_agent    text,
  signed_hash     text,
  paid_at         timestamptz,
  paid_cents      integer,
  stripe_session  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists sales_quotes_lead on sales_quotes (lead_id, created_at desc);
create index if not exists sales_quotes_status on sales_quotes (status, updated_at desc);

-- billing: once = paid at acceptance; monthly = first month paid at acceptance, then billed monthly;
-- invoiced = lab and MRO services billed later as used (never charged at checkout).
create table if not exists sales_quote_items (
  id            bigserial primary key,
  quote_id      bigint not null references sales_quotes(id) on delete cascade,
  price_item_id bigint references cpp_price_items(id) on delete set null,
  name          text not null,
  sku           text,
  category      text,
  description   text,
  unit          text,
  unit_cents    integer not null default 0 check (unit_cents >= 0),
  qty           integer not null default 0 check (qty >= 0),
  min_qty       integer not null default 0 check (min_qty >= 0),
  adjustable    boolean not null default true,
  billing       text not null default 'once' check (billing in ('once', 'monthly', 'invoiced')),
  sort          integer not null default 100
);
create index if not exists sales_quote_items_quote on sales_quote_items (quote_id, sort, id);

-- Each saved change (rep edit or AI prompt), so a change can be undone.
create table if not exists sales_quote_versions (
  id          bigserial primary key,
  quote_id    bigint not null references sales_quotes(id) on delete cascade,
  html        text not null,
  items       jsonb not null,
  prompt      text,
  summary     text,
  created_by  uuid references members(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists sales_quote_versions_quote on sales_quote_versions (quote_id, created_at desc);
