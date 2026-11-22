-- CRM: one record per person (keyed by email, or loc:<id> for a location with no email) across Contacts,
-- website leads and CPP members, with owner, stage, tags, follow-up date and an activity timeline.
create table if not exists crm_people (
  key           text primary key,
  owner_id      uuid references members(id) on delete set null,
  stage         text not null default 'new' check (stage in ('new', 'contacted', 'qualified', 'proposal', 'customer', 'cpp-member', 'not-interested')),
  tags          text[] not null default '{}',
  follow_up_at  date,
  updated_at    timestamptz not null default now()
);
create index if not exists crm_people_owner_idx on crm_people (owner_id);
create index if not exists crm_people_follow_idx on crm_people (follow_up_at) where follow_up_at is not null;

create table if not exists crm_activities (
  id          bigserial primary key,
  key         text not null,
  kind        text not null check (kind in ('note', 'call', 'email', 'meeting', 'task')),
  body        text not null,
  due_at      date,
  done_at     timestamptz,
  author_id   uuid references members(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists crm_activities_key_idx on crm_activities (key, created_at desc);
create index if not exists crm_activities_open_tasks on crm_activities (due_at) where kind = 'task' and done_at is null;

create index if not exists leads_email_lower_idx on leads (lower(email));
create index if not exists members_email_lower_idx on members (lower(email));
