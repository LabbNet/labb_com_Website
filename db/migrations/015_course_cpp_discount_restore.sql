-- Restore the 50% CPP discount on paid courses where an admin save from the older form reset it to 0.
update courses set cpp_discount_pct = 50 where cpp_discount_pct = 0 and not cpp_included and slug <> 'clinic-owners';
