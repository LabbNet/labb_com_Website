-- Quotes a CPP member gives a lead Labb passed them. Internal only: never sent to the client.
-- Region and industry are copied from the lead so analytics stay stable if the lead changes.
create table if not exists member_quotes (
  id           bigserial primary key,
  lead_id      bigint not null references leads(id) on delete cascade,
  member_id    uuid not null references members(id) on delete cascade,
  status       text not null default 'sent' check (status in ('draft', 'sent', 'accepted', 'declined')),
  quoted_on    date not null default current_date,
  state        text,
  industry     text,
  segment      text,
  notes        text,
  total_cents  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists member_quotes_member_idx on member_quotes (member_id, created_at desc);
create index if not exists member_quotes_lead_idx on member_quotes (lead_id);

create table if not exists member_quote_items (
  id               bigserial primary key,
  quote_id         bigint not null references member_quotes(id) on delete cascade,
  price_item_id    bigint references cpp_price_items(id) on delete set null,
  product_name     text not null,
  sku              text,
  category         text,
  unit             text,
  quantity         integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);
create index if not exists member_quote_items_quote_idx on member_quote_items (quote_id);
create index if not exists member_quote_items_product_idx on member_quote_items (price_item_id);
