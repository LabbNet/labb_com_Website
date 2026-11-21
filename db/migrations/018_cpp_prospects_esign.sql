-- CPP prospects and electronic signing of the CPP agreement.

-- A CPP application creates a member record with cpp_status 'prospect' (no login until Labb invites them).
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'members'::regclass and conname = 'members_cpp_status_check'
  loop execute format('alter table members drop constraint %I', c); end loop;
end $$;
alter table members add constraint members_cpp_status_check check (cpp_status in ('prospect', 'active', 'inactive'));
alter table members add column if not exists legal_name text;

-- The CPP agreement PDF Labb sends for signature. Versions are kept; exactly one is active.
create table if not exists contract_templates (
  id           bigserial primary key,
  title        text not null,
  version      text not null,
  filename     text not null,
  data         bytea not null,
  sha256       text not null,
  active       boolean not null default false,
  uploaded_by  uuid references members(id) on delete set null,
  uploaded_at  timestamptz not null default now()
);
create unique index if not exists contract_templates_one_active on contract_templates (active) where active;

-- One signing request per send. Only the SHA-256 of the link token is stored.
create table if not exists contract_requests (
  id                  bigserial primary key,
  member_id           uuid not null references members(id) on delete cascade,
  template_id         bigint not null references contract_templates(id),
  token_hash          text not null unique,
  status              text not null default 'sent' check (status in ('sent', 'viewed', 'signed', 'void')),
  sent_to             text not null,
  sent_by             uuid references members(id) on delete set null,
  sent_at             timestamptz not null default now(),
  expires_at          timestamptz not null,
  viewed_at           timestamptz,
  signed_at           timestamptz,
  signer_name         text,
  signer_title        text,
  signer_company      text,
  signer_ip           text,
  signer_agent        text,
  signed_sha256       text,
  member_contract_id  bigint references member_contracts(id) on delete set null
);
create index if not exists contract_requests_member_idx on contract_requests (member_id, sent_at desc);
