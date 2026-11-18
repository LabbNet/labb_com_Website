-- Online courses on labb.com. Learners are member accounts with role 'learner' (they never see the CPP portal).
do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'members'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%'
  loop execute format('alter table members drop constraint %I', c); end loop;
end $$;
alter table members add constraint members_role_check check (role in ('member', 'admin', 'learner'));

-- One row per learner per course. state is the course player's saved progress.
create table if not exists course_enrollments (
  id             bigserial primary key,
  member_id      uuid not null references members(id) on delete cascade,
  course         text not null,
  source         text not null check (source in ('purchase', 'cpp', 'admin')),
  stripe_session text,
  amount_cents   integer,
  state          jsonb,
  chapters_done  integer not null default 0,
  started_at     timestamptz,
  completed_at   timestamptz,
  cert_id        text,
  cert_name      text,
  created_by     uuid references members(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (member_id, course)
);
create index if not exists course_enrollments_course_idx on course_enrollments (course, completed_at);
create unique index if not exists course_enrollments_stripe_idx on course_enrollments (stripe_session) where stripe_session is not null;
