-- Ask an Expert: guidebook knowledge base and reviewed questions and answers.
create extension if not exists pg_trgm;

-- Searchable passages from the guidebooks, kit booklets, kit data and drug profiles (loaded by lib/kb.ts on start).
create table if not exists kb_chunks (
  id text primary key,
  source text not null,
  source_title text not null,
  url text,
  page int,
  heading text,
  body text not null,
  tsv tsvector generated always as (setweight(to_tsvector('english', coalesce(heading, '')), 'A') || setweight(to_tsvector('english', body), 'B')) stored
);
create index if not exists kb_chunks_tsv on kb_chunks using gin (tsv);
create table if not exists kb_meta (key text primary key, value text not null, updated_at timestamptz not null default now());

-- Every question asked. pending: waiting for a Labb admin; approved: reviewed answer (published unless kept private);
-- matched: answered on the spot from an approved answer; rejected: spam or off-topic.
create table if not exists ask_questions (
  id bigserial primary key,
  token text not null unique,
  question text not null,
  name text,
  email text,
  company text,
  lead_id bigint references leads(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'matched', 'rejected')),
  draft text,
  draft_source text,
  answer text,
  sources jsonb not null default '[]'::jsonb,
  confidence text,
  matched_id bigint references ask_questions(id) on delete set null,
  slug text unique,
  published boolean not null default false,
  reviewed_by uuid references members(id) on delete set null,
  reviewed_at timestamptz,
  emailed_at timestamptz,
  ip_hash text,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tsv tsvector generated always as (setweight(to_tsvector('english', question), 'A') || setweight(to_tsvector('english', coalesce(answer, '')), 'B')) stored
);
create index if not exists ask_questions_status on ask_questions (status, created_at desc);
create index if not exists ask_questions_trgm on ask_questions using gin (lower(question) gin_trgm_ops);
create index if not exists ask_questions_tsv on ask_questions using gin (tsv);
