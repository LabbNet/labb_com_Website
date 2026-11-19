-- HTML email broadcasts from Admin -> Email, to CPP members or newsletter subscribers.
create table if not exists email_campaigns (
  id          uuid primary key default gen_random_uuid(),
  audience    text not null check (audience in ('cpp', 'newsletter')),
  subject     text not null,
  preheader   text not null default '',
  html        text not null,
  wrap        boolean not null default true,
  status      text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  recipients  integer not null default 0,
  sent        integer not null default 0,
  failed      integer not null default 0,
  error       text,
  created_by  uuid references members(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  sent_by     uuid references members(id) on delete set null,
  sent_at     timestamptz
);
create index if not exists email_campaigns_created_idx on email_campaigns (created_at desc);

-- People who unsubscribed from an audience. Checked before every send.
create table if not exists email_suppressions (
  email      text not null,
  audience   text not null check (audience in ('cpp', 'newsletter')),
  created_at timestamptz not null default now(),
  primary key (email, audience)
);
