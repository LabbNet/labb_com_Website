-- Report how many CPP members the email list reaches now that members who haven't logged in yet are included.
do $mig$
declare a int; b int;
begin
  select count(distinct lower(email)) into a from members where role = 'member' and status = 'active' and cpp_status = 'active' and email like '%@%';
  select count(distinct lower(email)) into b from members where role = 'member' and status <> 'disabled' and cpp_status = 'active' and email like '%@%';
  raise notice '[058] CPP email list: % before, % now (includes members who have not logged in)', a, b;
end $mig$;
