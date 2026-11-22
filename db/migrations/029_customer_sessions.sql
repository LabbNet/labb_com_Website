-- Separate existing customers from prospects in Analytics. A visit counts as a customer visit when the visitor
-- clicks a login link (Client login or CPP member login), signs in, or opens the member or course areas.
create table if not exists session_flags (
  session  text not null,
  visitor  text,
  kind     text not null,   -- client-login or cpp-login
  ts       timestamptz not null default now(),
  primary key (session, kind)
);

create or replace view customer_sessions as
  select session from session_flags
  union
  select distinct session from page_views
  where member_id is not null or path ~ '^/(login|members|learn)(/|$)';
