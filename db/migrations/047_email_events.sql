-- Email analytics: delivery, open, click, bounce and spam events from the SendGrid Event Webhook.
create table if not exists email_events (
  id          bigserial primary key,
  sg_event_id text unique,
  campaign    uuid references email_campaigns(id) on delete cascade,
  sequence_run bigint references sequence_runs(id) on delete set null,
  step        int,
  email       text not null,
  event       text not null,
  url         text,
  reason      text,
  ts          timestamptz not null default now()
);
create index if not exists email_events_campaign on email_events (campaign, event);
create index if not exists email_events_seq on email_events (sequence_run, step, event) where sequence_run is not null;
create index if not exists email_events_email on email_events (lower(email), ts desc);
create index if not exists email_events_ts on email_events (ts desc);
