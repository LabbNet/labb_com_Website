-- Each guidebook article gets its own cover image instead of the shared guidebook cover.
update articles a set cover_url = '/img/news/' || a.slug || '.webp', image_alt = v.alt, updated_at = now()
from (values
  ('construction-drug-testing-in-house-vs-clinic', 'Worker on a construction site reading a rapid drug test with a phone'),
  ('post-incident-drug-testing-construction-osha', 'Illustration of a hard hat and a clock for post-incident testing'),
  ('background-checks-construction-hiring-fcra', 'Employment application on a clipboard next to a hard hat'),
  ('manufacturing-drug-testing-program-downtime', 'Illustration of production gears and a clock'),
  ('audit-workplace-drug-testing-program', 'Illustration of a program audit checklist and a magnifying glass'),
  ('choosing-drug-test-panel-specimen-manufacturing', 'Labb urine drug test cups with different panels'),
  ('warehouse-drug-testing-across-shifts', 'Illustration of warehouse boxes under the sun and moon for day and night shifts'),
  ('dot-vs-company-drug-testing-logistics', 'Illustration comparing a DOT truck with a company forklift'),
  ('objective-digital-drug-test-reader', 'Phone app reading a urine drug test cup'),
  ('how-to-start-workplace-drug-testing-program', 'Illustration of a calendar for a drug testing program timeline'),
  ('pre-employment-random-reasonable-suspicion-testing', 'Illustration of the five types of workplace drug testing'),
  ('urine-vs-oral-fluid-vs-hair-drug-testing', 'Labb urine cups and oral fluid drug tests'),
  ('drug-diversion-prevention-healthcare-testing', 'Illustration of a medication bottle, pills and a shield'),
  ('drug-testing-nurses-licensed-professionals', 'Stethoscope next to a tablet showing a donor intake form'),
  ('drug-testing-hospital-shifts-units', 'Illustration of a hospital and a clock'),
  ('drug-testing-hospitality-high-turnover', 'Illustration of a hotel service bell'),
  ('alcohol-policy-restaurants-hotels-events', 'Illustration of a wine glass and a written alcohol policy'),
  ('reasonable-suspicion-testing-managers-hospitality', 'Illustration of an eye and a manager''s written observation'),
  ('how-lateral-flow-rapid-drug-tests-work', 'Oral fluid rapid drug test showing result lines'),
  ('reading-drug-test-package-inserts-cutoffs', 'Procedure card for an oral fluid rapid drug test'),
  ('grow-clinic-employer-drug-testing-accounts', 'Urgent care clinic testing station with a digital reader'),
  ('fcra-employer-background-check-steps', 'Illustration of the seven steps of an FCRA background check'),
  ('fair-chance-hiring-ban-the-box', 'Illustration of a job application with the criminal history box removed'),
  ('common-employment-background-check-searches', 'Illustration of an ID card under a magnifying glass'),
  ('true-cost-of-workplace-drug-testing', 'Illustration of an iceberg showing hidden drug testing costs'),
  ('rapid-testing-vs-lab-testing-cost', 'Illustration of a scale weighing a rapid test cup against a lab flask'),
  ('drug-testing-budget-planning', 'Illustration of a budget chart and a calculator')
) as v(slug, alt)
where a.slug = v.slug and a.cover_type is null;
