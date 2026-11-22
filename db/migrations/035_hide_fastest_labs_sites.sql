-- Fastest Labs locations are not offered in the Quick Test site finder (active litigation).
update contact_imports set qt_hidden = true
where company ilike '%fastest lab%' or company ilike '%fastestlab%' or email ilike '%@fastestlabs.com' or email ilike '%@fasteslabs.com';
