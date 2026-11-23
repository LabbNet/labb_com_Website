-- Shelf-Life Tracker is on for CPP members by default. Labb can still turn it off per member.
alter table members alter column shelf_life_tracker set default true;
update members set shelf_life_tracker = true where role = 'member' and cpp_status = 'active';
