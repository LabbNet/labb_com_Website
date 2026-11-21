-- Where to write the partner's details and both signatures on a template, and Labb's countersignature.
alter table contract_templates add column if not exists fields jsonb;
alter table contract_requests add column if not exists signer_state text;
alter table contract_requests add column if not exists labb_signer_id uuid references members(id) on delete set null;
alter table contract_requests add column if not exists labb_signer_name text;
alter table contract_requests add column if not exists labb_signer_title text;
alter table contract_requests add column if not exists labb_signed_at timestamptz;
alter table contract_requests add column if not exists labb_ip text;
