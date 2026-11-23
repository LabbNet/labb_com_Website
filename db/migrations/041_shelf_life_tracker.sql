-- Per-member switch for the Shelf-Life Tracker tab in the CPP member area (off by default).
alter table members add column if not exists shelf_life_tracker boolean not null default false;
