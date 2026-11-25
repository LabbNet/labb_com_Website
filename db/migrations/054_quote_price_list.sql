-- Labb's own quote price list: two prices per item, under 100 kits a month and 100+ kits a month.
-- CPP prices (cpp_price_items) are CPP members' cost and are never used for Labb quotes.
create table if not exists quote_price_items (
  id              bigserial primary key,
  category        text not null check (category in ('saas', 'readers', 'stands', 'rapid-kits', 'lab-mro', 'services')),
  name            text not null,
  sku             text,
  description     text,
  unit            text,
  under100_cents  integer check (under100_cents >= 0),
  over100_cents   integer check (over100_cents >= 0),
  sort            integer not null default 100,
  active          boolean not null default true,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references members(id) on delete set null
);
create index if not exists quote_price_items_cat on quote_price_items (category, sort, name);

-- Quote lines now point at this list, not the CPP list.
alter table sales_quote_items drop constraint if exists sales_quote_items_price_item_id_fkey;
update sales_quote_items set price_item_id = null;
alter table sales_quote_items add constraint sales_quote_items_price_item_id_fkey foreign key (price_item_id) references quote_price_items(id) on delete set null;
update sales_quotes set price_level = 'under100' where price_level not in ('under100', 'over100');
alter table sales_quotes alter column price_level set default 'under100';

-- Starting prices from the Labb Station proposal (Nov 2026). The 100+ price starts equal; set it under Quotes, Quote prices.
insert into quote_price_items (category, name, sku, description, unit, under100_cents, over100_cents, sort)
select * from (values
  ('saas', 'Labb Station subscription', 'LS-SUB', 'Per physical location. Unlimited collectors and mobile collectors. Digital reader platform, eCCF, client portal, co-branding, dashboards', 'location', 12900, 12900, 10),
  ('services', 'Setup and onboarding', 'LS-SETUP', 'Account setup, user roles, logo upload, PDF training documents. Included.', null, 0, 0, 20),
  ('services', 'Labb Station and rapid test certifications', 'LS-CERT', 'Online certification programs. Included.', null, 0, 0, 30),
  ('readers', 'Labb Station system', 'LS-SYS', 'Tablet and stand', 'each', 25900, 25900, 40),
  ('stands', 'Labb Station stand', 'LS-STAND', 'Stand only', 'each', 4900, 4900, 50),
  ('rapid-kits', 'UA:06B 6 panel rapid urine test cup', 'UA:06B', 'Includes lab confirmation and MRO review. Sold 25 per box.', 'test', 699, 699, 60),
  ('rapid-kits', 'UA:13A 13 panel rapid urine test cup', 'UA:13A', 'Includes lab confirmation and MRO review. Sold 25 per box.', 'test', 799, 799, 70),
  ('rapid-kits', 'UA:16A 16 panel rapid urine test cup', 'UA:16A', 'Includes lab confirmation and MRO review. Sold 25 per box.', 'test', 899, 899, 80),
  ('rapid-kits', 'UA:18C FUO 18 panel rapid urine test cup with ETG (alcohol)', 'UA:18C', 'Includes lab confirmation and MRO review. Sold 25 per box.', 'test', 1099, 1099, 90),
  ('rapid-kits', 'UA:23A FUO 23 panel rapid urine test cup with ETG (alcohol)', 'UA:23A', 'Includes lab confirmation and MRO review. Sold 25 per box.', 'test', 1399, 1399, 100),
  ('rapid-kits', 'OR:06A 6 panel rapid oral fluid test', 'OR:06A', 'Includes lab confirmation and MRO review. Sold 25 per box.', 'test', 699, 699, 110),
  ('rapid-kits', 'OR:14A 14 panel rapid oral fluid test', 'OR:14A', 'Includes lab confirmation and MRO review. Sold 25 per box.', 'test', 1099, 1099, 120),
  ('rapid-kits', 'ORF:31C OraFlo privacy oral fluid test', 'ORF:31C', '10 drugs, alcohol tested separately. Includes lab confirmation and MRO review. Sold 25 per box.', 'test', 1199, 1199, 130),
  ('lab-mro', 'Regulated (DOT) lab test', 'LAB-DOT', 'Laboratory testing, billed monthly after the test is complete', 'test', 1650, 1650, 140),
  ('lab-mro', 'SAP panel', 'LAB-SAP', 'Laboratory testing, billed monthly after the test is complete', 'test', 1650, 1650, 150),
  ('lab-mro', 'Flex panel', 'LAB-FLEX', 'Contact Labb sales for pricing', 'test', null, null, 160),
  ('lab-mro', 'Flex 15 panel', 'LAB-FLEX15', 'Contact Labb sales for pricing', 'test', null, null, 170),
  ('lab-mro', 'Flex 16 panel', 'LAB-FLEX16', 'Contact Labb sales for pricing', 'test', null, null, 180),
  ('lab-mro', 'Ultraflex panel', 'LAB-UFLEX', 'Contact Labb sales for pricing', 'test', null, null, 190),
  ('lab-mro', 'MRO review', 'MRO', 'Medical Review Officer review of laboratory tests', 'lab test', 550, 550, 200)
) v(category, name, sku, description, unit, under100_cents, over100_cents, sort)
where not exists (select 1 from quote_price_items);
