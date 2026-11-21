-- Background check price list for CPP members. Labb's cost is stored (admins only); the CPP price is
-- calculated as cost + 10%, rounded up to the nearest $0.05 (lib/backgroundPricing.ts).
create table if not exists cpp_background_prices (
  id          bigserial primary key,
  ref         text not null unique,
  kind        text not null check (kind in ('package', 'check')),
  category    text not null,
  name        text not null,
  includes    text,
  cost_cents  integer not null check (cost_cents >= 0),
  note        text,
  sort        integer not null default 100,
  active      boolean not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references members(id) on delete set null
);

-- Labb costs from Labb_Background_Check_Pricing (October 14, 2026).
insert into cpp_background_prices (ref, kind, category, name, includes, cost_cents, note, sort) values
  ('P01', 'package', 'Packages', 'National Criminal Scan', 'National criminal database, SSN trace, sex offender registry and sanctions. Alias names included.', 950, 'Order with a county search for FCRA compliance.', 0),
  ('P02', 'package', 'Packages', 'Standard Criminal Screen', 'National Criminal Scan plus 1 county of residence and federal criminal in the state of residence.', 1899, null, 10),
  ('P03', 'package', 'Packages', 'Full Criminal Screen', 'National Criminal Scan plus all counties of residence (7 years) and federal criminal in all states (7 years).', 3599, null, 20),
  ('P04', 'package', 'Packages', 'Professional Screen', 'Full Criminal Screen plus 2 employment verifications and 1 education verification.', 6384, null, 30),
  ('P05', 'package', 'Packages', 'Social Media Screen', 'Standard Criminal Screen plus a social media check.', 4798, null, 40),
  ('P06', 'package', 'Packages', 'DOT Driver Screen', 'Full Criminal Screen plus an MVR driving record.', 4194, null, 50),
  ('P07', 'package', 'Packages', 'Healthcare Credentialing Screen', 'Full Criminal Screen plus FACIS Level 3 healthcare sanctions and a professional credential or license verification.', 6293, null, 60),
  ('P08', 'package', 'Packages', 'Enhanced Due Diligence Screen', 'Full Criminal Screen plus politically exposed persons, adverse media scan and public legal records.', 4846, null, 70),
  ('C04', 'check', 'Criminal', 'SSN Trace', 'Address history, 7 years.', 395, null, 80),
  ('C05', 'check', 'Criminal', 'National Criminal Database Scan', null, 795, 'Order with a county criminal search for FCRA compliance.', 90),
  ('C06', 'check', 'Criminal', 'Sex Offender Registry', null, 495, null, 100),
  ('C10', 'check', 'Criminal', 'County Criminal', '1 county, 7 years, felony and misdemeanor.', 895, null, 110),
  ('C11', 'check', 'Criminal', 'Federal Criminal', null, 895, null, 120),
  ('C12', 'check', 'Criminal', 'Statewide Criminal', '7 years, per state.', 995, null, 130),
  ('C29', 'check', 'Criminal', 'Alias Name Search', 'County criminal, per additional name.', 895, 'Included at no charge in the criminal packages.', 140),
  ('C07', 'check', 'Sanctions and watch lists', 'Global Watch List', null, 495, null, 150),
  ('C08', 'check', 'Sanctions and watch lists', 'OFAC Sanctions', null, 495, null, 160),
  ('C09', 'check', 'Sanctions and watch lists', 'Sanctions: OIG, SAM and GSA', null, 495, null, 170),
  ('C23', 'check', 'Sanctions and watch lists', 'Global Watch List and Sanctions, bundled', null, 249, null, 180),
  ('C24', 'check', 'Sanctions and watch lists', 'Politically Exposed Persons (PEP)', null, 249, null, 190),
  ('C18', 'check', 'Sanctions and watch lists', 'FACIS Level 3 healthcare sanctions', null, 895, null, 200),
  ('C14', 'check', 'Identity', 'Consent Based SSN Validation (CBSV)', null, 995, null, 210),
  ('C27', 'check', 'Identity', 'Biometric Identity Verification', null, 150, null, 220),
  ('C15', 'check', 'Verifications', 'Employment Verification', 'Per employer.', 895, null, 230),
  ('C16', 'check', 'Verifications', 'Education Verification', 'Per degree.', 995, null, 240),
  ('C17', 'check', 'Verifications', 'Professional Credential or License Verification', null, 1799, null, 250),
  ('C19', 'check', 'Driving', 'MVR Driving Record', null, 595, null, 260),
  ('C20', 'check', 'Driving', 'CDLIS Commercial Driver License Information', null, 595, null, 270),
  ('C21', 'check', 'Driving', 'PSP Screening', null, 1395, 'Requires the client''s FMCSA credentials.', 280),
  ('C13', 'check', 'Civil and credit', 'County Civil', null, 995, null, 290),
  ('C26', 'check', 'Civil and credit', 'Public Legal Records', null, 749, null, 300),
  ('C28', 'check', 'Civil and credit', 'Pre-Employment or Tenant Credit Check', null, 995, null, 310),
  ('C22', 'check', 'Media', 'Social Media Check', null, 2899, null, 320),
  ('C25', 'check', 'Media', 'Adverse Media Scan', null, 249, null, 330)
on conflict (ref) do nothing;
