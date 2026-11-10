-- CPP member accounts
create table if not exists members (
  id               uuid primary key default gen_random_uuid(),
  username         text not null,
  email            text not null,
  name             text not null,
  clinic           text,
  role             text not null default 'member' check (role in ('member', 'admin')),
  status           text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  password_hash    text,
  session_version  integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_login_at    timestamptz,
  created_by       uuid references members(id) on delete set null
);
create unique index if not exists members_username_key on members (lower(username));
create unique index if not exists members_email_key on members (lower(email));

-- One-time links for account setup (invite) and password reset. Only the SHA-256 of the token is stored.
create table if not exists member_tokens (
  token_hash  text primary key,
  member_id   uuid not null references members(id) on delete cascade,
  purpose     text not null check (purpose in ('invite', 'reset')),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists member_tokens_member_idx on member_tokens (member_id);

-- Audit trail of account events (logins, invites, status changes).
create table if not exists member_events (
  id          bigserial primary key,
  member_id   uuid references members(id) on delete cascade,
  actor_id    uuid references members(id) on delete set null,
  event       text not null,
  detail      text,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists member_events_member_idx on member_events (member_id, created_at desc);
