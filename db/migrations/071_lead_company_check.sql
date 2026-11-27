-- Report, by form, how many leads have no company or a company that is just the contact's name.
do $mig$ declare r record; begin
  for r in select type, count(*)::int as total,
      count(*) filter (where coalesce(trim(company), '') = '')::int as blank,
      count(*) filter (where lower(trim(company)) = lower(trim(concat_ws(' ', first_name, last_name))))::int as same_as_name
    from leads where type not in ('newsletter') group by type order by 1 loop
    raise notice '[071] % leads: % total, % no company, % company = contact name', r.type, r.total, r.blank, r.same_as_name;
  end loop;
end $mig$;
