-- Which booklets and brochures a CPP member asked for, and how many of each. brochures keeps the total.
alter table trade_show_requests add column if not exists brochure_items jsonb not null default '[]'::jsonb;
