-- Percent off a course's price for active CPP members who check out while signed in.
-- Not used when the course is included free for CPP members.
alter table courses add column if not exists cpp_discount_pct integer not null default 0 check (cpp_discount_pct between 0 and 100);
update courses set cpp_discount_pct = 50 where slug <> 'clinic-owners' and cpp_discount_pct = 0;
