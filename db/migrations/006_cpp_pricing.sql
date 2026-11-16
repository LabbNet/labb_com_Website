-- CPP member price list, managed by Labb admins and shown in the member area.
create table if not exists cpp_price_items (
  id              bigserial primary key,
  category        text not null check (category in ('rapid-kits', 'readers', 'stands', 'saas', 'lab-mro')),
  name            text not null,
  sku             text,
  description     text,
  unit            text,
  member_cents    integer,
  employer_cents  integer,
  notes           text,
  sort            integer not null default 100,
  active          boolean not null default true,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references members(id) on delete set null
);
create index if not exists cpp_price_items_cat_idx on cpp_price_items (category, sort, name);
