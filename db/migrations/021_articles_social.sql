-- Articles written in Admin -> Articles, and their distribution to social media and the newsletter.
create table if not exists articles (
  id           bigserial primary key,
  slug         text not null unique,
  title        text not null,
  description  text not null default '',
  body         text not null default '',
  cover        bytea,
  cover_type   text,
  cover_w      integer,
  cover_h      integer,
  image_alt    text,
  author       text not null default 'Labb',
  status       text not null default 'draft' check (status in ('draft', 'published')),
  publish_at   timestamptz,
  created_by   uuid references members(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists articles_publish_idx on articles (status, publish_at desc);

-- One row per Send: which outlets, the post text, and when it goes out.
create table if not exists article_posts (
  id            bigserial primary key,
  article_id    bigint not null references articles(id) on delete cascade,
  channels      text[] not null,
  message       text not null,
  scheduled_at  timestamptz not null default now(),
  status        text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'partial', 'failed', 'canceled')),
  result        jsonb,
  sent_at       timestamptz,
  created_by    uuid references members(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists article_posts_due_idx on article_posts (status, scheduled_at);
