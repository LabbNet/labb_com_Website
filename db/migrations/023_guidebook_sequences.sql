-- Guidebook promotional sequences, and the articles they feature.

-- Articles can use a static image as their cover, and record which guidebook they support.
alter table articles add column if not exists cover_url text;
alter table articles add column if not exists guidebook text;

-- One run = one lead receiving one guidebook sequence. Steps are defined in lib/sequences.ts.
create table if not exists sequence_runs (
  id          bigserial primary key,
  sequence    text not null,
  lead_id     bigint references leads(id) on delete set null,
  email       text not null,
  name        text,
  company     text,
  started_by  uuid references members(id) on delete set null,
  partner_id  uuid references members(id) on delete set null,  -- set when a CPP member started it; replies go to them
  status      text not null default 'active' check (status in ('active', 'completed', 'stopped', 'unsubscribed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists sequence_runs_one_active on sequence_runs (lower(email), sequence) where status = 'active';
create index if not exists sequence_runs_lead_idx on sequence_runs (lead_id);

create table if not exists sequence_sends (
  id       bigserial primary key,
  run_id   bigint not null references sequence_runs(id) on delete cascade,
  step     integer not null,
  due_at   timestamptz not null,
  status   text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'canceled')),
  sent_at  timestamptz,
  error    text,
  unique (run_id, step)
);
create index if not exists sequence_sends_due_idx on sequence_sends (status, due_at);

-- Unsubscribing from guidebook emails.
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'email_suppressions'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%audience%'
  loop execute format('alter table email_suppressions drop constraint %I', c); end loop;
end $$;
alter table email_suppressions add constraint email_suppressions_audience_check check (audience in ('cpp', 'employers', 'clinics', 'newsletter', 'sequences'));

-- Articles that support each guidebook, published every two weeks going back from November 21, 2026.

insert into articles (slug, title, description, body, cover_url, cover_w, cover_h, image_alt, author, status, publish_at, guidebook) values
($a$construction-drug-testing-in-house-vs-clinic$a$, $a$Construction Drug Testing: In-House vs. Sending Workers to a Clinic$a$, $a$How construction companies compare in-house drug testing with clinic visits on speed, cost, jobsite downtime and compliance.$a$, $a$Every hour a new hire spends driving to a clinic is an hour they are not on the jobsite. For construction companies that hire in waves and staff projects on short notice, how you run drug testing has a direct effect on schedules.

## The clinic model

Sending applicants and employees to an outside clinic is simple to start. The clinic collects the specimen, a laboratory screens it and results come back in a day or more. The trade-offs show up in the field: travel time, waiting rooms, results that arrive after the start date, and post-incident tests that happen hours after the event.

## The in-house model

With in-house testing, trained staff in your office or on the jobsite collect the specimen and run a rapid screen. Negative results are known in minutes, so a crew member can start the same day. Only non-negative screens go to a laboratory for confirmation and medical review.

In-house testing works well when you:

- Hire often or across many sites
- Need post-incident tests fast, while the result still means something
- Want one documented process instead of a different clinic for every project

## What in-house does not change

The rules stay the same. DOT-regulated drivers still follow federal testing rules and laboratory testing. Your written policy, consent, chain of custody and confidentiality all still apply. In-house testing moves the collection closer to the work. It does not lower the standard.

## Making the result objective

The most common objection to in-house testing is reading the result by eye. A faint line read differently by two supervisors is a problem in a dispute. A digital reader such as [Labb Station](/labb-station) reads the test the same way every time and documents the result with the donor and collection details.

## Where to start

The [Construction Screening Guidebook](/resources/construction-screening-guidebook) walks through the decision, a step-by-step plan to move testing in-house, and a 25-question practice exam to check your team is ready.$a$, $a$/img/news/construction-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Construction Screening Guidebook cover$a$, 'Labb', 'published', '2026-11-21T12:00:00+00:00', $a$construction-screening-guidebook$a$),
($a$manufacturing-drug-testing-program-downtime$a$, $a$How Manufacturers Cut Downtime With In-House Drug Testing$a$, $a$Why manufacturers move drug testing in-house to reduce hiring delays and downtime, and what a compliant plant-floor program looks like.$a$, $a$On a production line, an empty station costs money every minute. When drug testing depends on an outside clinic, new hires wait days to start and a post-incident test can pull a supervisor off the floor for hours.

## Where the time goes

With clinic-based testing, the delays add up: scheduling, travel, waiting rooms and laboratory turnaround for every specimen, even though most results are negative.

## How in-house testing changes it

A trained collector at the plant runs a rapid screen. Negatives are known in minutes, so the new hire starts on schedule. Non-negative screens go to a laboratory for confirmation and review by a medical review officer before any decision.

## Staffing agency workers

Many plants rely on temporary workers. Your policy and your agency contract should be clear about who tests agency workers, when and to what standard, so everyone on the floor is held to the same rules.

## Customer requirements

Some customers write drug testing into their supplier contracts. A documented, consistent in-house program makes those audits easier.

## Before you switch

Moving in-house works best with a plan: write or update the policy, train collectors, set up a private collection area and decide which tests stay at a laboratory.

The [Manufacturing Screening Guidebook](/resources/manufacturing-screening-guidebook) includes a four-phase transition plan and the true cost of testing.$a$, $a$/img/news/manufacturing-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Manufacturing Screening Guidebook cover$a$, 'Labb', 'published', '2026-11-07T12:00:00+00:00', $a$manufacturing-screening-guidebook$a$),
($a$warehouse-drug-testing-across-shifts$a$, $a$Drug Testing Across Shifts and Sites in Warehousing and Distribution$a$, $a$How warehouses and distribution centers run consistent drug testing across night shifts, weekends and multiple sites.$a$, $a$Warehouses and distribution centers run around the clock. Drug testing that only works from nine to five leaves gaps: a night-shift hire who cannot start, or a post-incident test that waits until morning.

## Cover every shift

Train at least one collector on each shift and give them a private collection area that is ready at any hour. With rapid testing on site, a negative result is known in minutes, whatever the time.

## Keep sites consistent

When a company runs several buildings, small differences become big problems. One site uses a different panel, another skips a step in the chain of custody. Use one written policy, one set of collection steps and one system to record results.

## Seasonal hiring

Peak season can mean hiring hundreds of people in weeks. In-house testing removes the clinic bottleneck so new hires start on time.

## Drivers

Commercial drivers who fall under DOT rules follow federal testing requirements, including laboratory testing. Non-DOT roles can follow your company policy.

## Learn more

Chapter 4 of the [Logistics Screening Guidebook](/resources/logistics-screening-guidebook) covers roles, collection areas across shifts and sites, and confidentiality.$a$, $a$/img/news/logistics-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Logistics Screening Guidebook cover$a$, 'Labb', 'published', '2026-10-24T12:00:00+00:00', $a$logistics-screening-guidebook$a$),
($a$how-to-start-workplace-drug-testing-program$a$, $a$How to Start a Workplace Drug Testing Program: A Week-by-Week Plan$a$, $a$A practical timeline for employers starting a drug and alcohol testing program, from the first decision to the first test.$a$, $a$Starting a drug testing program feels bigger than it is. Most employers can go from decision to first test in about six to eight weeks if they work through the steps in order.

## Weeks 1 and 2: decide what the program is for

- Why are you testing: safety, insurance, customer requirements, or all three?
- Who will be tested, and are any employees covered by DOT rules?
- Which testing reasons will you use: pre-employment, random, reasonable suspicion, post-accident, return to duty?

## Weeks 3 and 4: write the policy

A written policy is the foundation. It should name the testing reasons, the drugs and specimens, the consequences, how results stay confidential and how the policy follows your state's laws, including marijuana and prescription rules. Have counsel review it.

## Week 5: choose how you will test

Decide whether specimens go to a clinic and laboratory, are screened in-house with rapid tests, or a mix. Choose your panel and specimen for each testing reason.

## Week 6: train people

Train collectors on collection and chain of custody. Train supervisors on recognizing signs of use and documenting reasonable suspicion.

## Weeks 7 and 8: announce and launch

Tell employees about the policy before it takes effect, collect signed acknowledgments and run your first tests.

## Get the full checklist

The [Employers Guidebook](/resources/employers-guidebook) includes the complete setup checklist and timeline, plus 16 chapters on the law, the drugs, specimens, collection, results and running the program.$a$, $a$/img/news/employers-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Employers Guidebook cover$a$, 'Labb', 'published', '2026-10-10T12:00:00+00:00', $a$employers-guidebook$a$),
($a$drug-diversion-prevention-healthcare-testing$a$, $a$How Drug Testing Fits a Healthcare Drug Diversion Prevention Program$a$, $a$Drug diversion is a patient safety risk. Here is how workplace drug testing supports a hospital or clinic diversion prevention program.$a$, $a$Drug diversion, when controlled medications are taken for personal use or sale, puts patients at risk and exposes healthcare employers to regulatory and legal action. Testing is one part of a prevention program, not the whole of it.

## What a diversion program includes

- Controls on how medications are stored, dispensed and wasted
- Monitoring of dispensing records for unusual patterns
- Training staff to recognize and report concerns
- A clear response process when diversion is suspected

## Where testing fits

- **Pre-employment** testing sets expectations for every new hire
- **Reasonable suspicion** testing when a supervisor documents signs of impairment or a dispensing pattern raises concern
- **For-cause** testing as part of a diversion investigation
- **Follow-up** testing for staff returning to work under a monitoring agreement

## Test for what is being diverted

Standard workplace panels may not include the medications most often diverted in healthcare settings, such as fentanyl and other synthetic opioids. Review your panel with your diversion and pharmacy leaders.

## Coordinate with licensing rules

Nurses, pharmacists and physicians may be subject to licensing board requirements and monitoring programs. Your policy should explain how testing works alongside them.

The [Healthcare Edition guidebook](/resources/healthcare-screening-guidebook) includes chapters on drug diversion and licensed professionals.$a$, $a$/img/news/healthcare-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Employer Guidebook Healthcare Edition cover$a$, 'Labb', 'published', '2026-09-26T12:00:00+00:00', $a$healthcare-screening-guidebook$a$),
($a$drug-testing-hospitality-high-turnover$a$, $a$Drug Testing in Hospitality: Hiring Fast Without Adding Risk$a$, $a$How hotels, restaurants and event venues run drug testing that keeps up with high turnover and seasonal hiring.$a$, $a$Hospitality hires constantly. Turnover is high, peak seasons demand dozens of new hires at once and new staff often need to start within days. A testing program that slows hiring will be skipped. One that keeps up protects guests and staff.

## Decide who you test

Many hospitality employers focus testing on safety-sensitive and trust roles: drivers, maintenance, security and staff who handle cash or alcohol. Others test everyone. Either way, write it down and apply it the same way.

## Remove the clinic bottleneck

Sending every applicant to an outside clinic adds days. Rapid testing on site gives a negative result in minutes so a new hire can start the same week. Non-negative screens go to a laboratory for confirmation.

## Seasonal and temporary staff

Seasonal hires and staffing agency workers should meet the same standard. Make sure your agency contracts say who tests and how.

## Multiple properties

Hotel groups and restaurant brands need one policy across every location. A shared system for ordering and recording tests keeps managers consistent.

The [Hospitality Edition guidebook](/resources/hospitality-screening-guidebook) includes a chapter on designing a program for a hospitality workforce.$a$, $a$/img/news/hospitality-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Employer Guidebook Hospitality Edition cover$a$, 'Labb', 'published', '2026-09-12T12:00:00+00:00', $a$hospitality-screening-guidebook$a$),
($a$how-lateral-flow-rapid-drug-tests-work$a$, $a$How Lateral Flow Rapid Drug Tests Work, and What Affects Accuracy$a$, $a$A plain explanation of lateral flow immunoassay drug tests for clinic owners and collectors, and the factors that affect accuracy.$a$, $a$Most rapid drug tests use lateral flow immunoassay, the same basic technology as many other rapid diagnostic tests. Understanding how it works helps collectors read results correctly and explain them.

## The basics

The specimen moves along a strip by capillary action. Each drug zone on the strip contains antibodies and a drug-conjugate. If the drug is absent, a line forms in the test zone. If the drug is present above the cutoff, it blocks the line from forming.

That is why, on most drug tests, **a line means negative** and **no line means non-negative**. A control line must also appear for the test to be valid.

## Cutoffs

Each drug has a cutoff concentration. Below it, the test reads negative even if some drug is present. Cutoffs are listed on the package insert.

## What affects accuracy

- Reading too early or too late
- Specimen temperature and volume
- Storage conditions and expiration dates
- Cross-reactivity with other substances
- Faint lines read by eye

## Make the read objective

A digital reader such as [Labb Station](/labb-station) reads the strip the same way every time and records the result, removing the guesswork around faint lines.

## Remember: it is a screen

A non-negative rapid test is a preliminary result. It goes to a laboratory for confirmation and medical review.

The [Clinic Owners Guidebook](/resources/clinic-owners-guidebook) covers rapid test technology, kit types, package inserts and quality control in depth.$a$, $a$/img/news/clinic-owners-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Clinic Owners Guidebook cover$a$, 'Labb', 'published', '2026-08-29T12:00:00+00:00', $a$clinic-owners-guidebook$a$),
($a$fcra-employer-background-check-steps$a$, $a$The FCRA Background Check Process, Step by Step$a$, $a$The steps employers and screening providers follow under the Fair Credit Reporting Act, from disclosure and authorization to adverse action.$a$, $a$When an employer uses a screening company to run a background check for employment, the Fair Credit Reporting Act sets out a process. Skipping a step is one of the most common sources of screening lawsuits.

## 1. Disclosure

Give the candidate a clear written disclosure that a background report may be obtained. It must be a standalone document, not buried in the application.

## 2. Authorization

Get the candidate's written authorization before ordering the report.

## 3. Certification

The employer certifies to the screening company that it has followed these steps and will comply with the FCRA and equal opportunity laws.

## 4. The report

The screening company runs the searches and provides a report, following its own duties to use reasonable procedures for accuracy.

## 5. Pre-adverse action

If the employer may decide against the candidate based on the report, it sends a pre-adverse action notice, a copy of the report and a summary of rights under the FCRA.

## 6. Time to respond

The candidate gets a reasonable period to dispute or explain the information.

## 7. Adverse action

If the employer makes a final decision, it sends an adverse action notice with the required information.

State and local laws can add steps. The [Background Screening Guidebook](/resources/background-screening-guidebook) covers the FCRA and state rules in detail. This article is general information, not legal advice.$a$, $a$/img/news/employment-background-screening-guidebook-article.webp$a$, 1200, 750, $a$Background Screening Guidebook cover$a$, 'Labb', 'published', '2026-08-15T12:00:00+00:00', $a$background-screening-guidebook$a$),
($a$true-cost-of-workplace-drug-testing$a$, $a$What Workplace Drug Testing Really Costs$a$, $a$The real cost of a drug testing program goes beyond the price per test. Here is how positive rates, confirmation and medical review drive the budget.$a$, $a$Most employers compare drug testing on price per test. The real cost of a program depends on more than that, and one number moves the budget more than any other: the positive rate.

## The parts of the cost

- The screen itself, rapid or laboratory
- Collection, including staff time or clinic fees
- Laboratory confirmation of non-negative screens
- Medical review officer review
- Time away from work and hiring delays
- Administration and recordkeeping

## Why the positive rate matters

A simple way to think about it:

**Cost per test = fixed cost + (positive rate x cost to confirm and review one positive)**

With in-house rapid testing, negatives stop on site. Only non-negatives carry laboratory and medical review costs, so the positive rate drives both. With straight-to-laboratory testing, confirmation is usually inside the laboratory fee and the positive rate mainly drives medical review.

## Hidden costs

The cost of a new hire waiting days for a result, or of a supervisor driving an employee to a clinic after an incident, rarely appears on an invoice but is real.

## Get the numbers

The [Drug Testing Cost Guidebook](/resources/drug-testing-cost-guidebook) explains every cost, positive rates by specimen and how to compare models.$a$, $a$/img/news/drug-testing-cost-guidebook-article.webp$a$, 1200, 750, $a$Drug Testing Cost Guidebook cover$a$, 'Labb', 'published', '2026-08-01T12:00:00+00:00', $a$drug-testing-cost-guidebook$a$),
($a$post-incident-drug-testing-construction-osha$a$, $a$Post-Incident Drug Testing on the Jobsite: Timing, OSHA and Documentation$a$, $a$What construction safety managers need to know about post-incident drug testing: timing, OSHA's anti-retaliation rule and a defensible record.$a$, $a$After an incident on the jobsite, the questions start quickly: what happened, who was involved and whether impairment played a part. A post-incident drug test can answer the last question, but only if it is done at the right time and for the right reasons.

## Timing matters

Drugs and alcohol leave the body over hours and days. A test taken late can miss what was present at the time of the incident. That is one reason construction companies move testing in-house: a trained collector on site can test within minutes instead of waiting for a clinic appointment.

## Follow OSHA's anti-retaliation rule

OSHA does not ban post-incident testing, but its recordkeeping rule prohibits retaliating against employees for reporting injuries. Blanket testing of everyone who reports an injury can discourage reporting. Most employers handle this by testing when there is a reasonable possibility that drug or alcohol use could have contributed to the incident, or when another law or contract requires it, and by writing that standard into their policy.

## Write it down

A defensible post-incident test has a clear record:

- Why the test was ordered and by whom
- When the incident happened and when the test was collected
- The collection steps and chain of custody
- The result and what happened next

## Keep it confidential

Results belong in a confidential file, separate from general personnel records, shared only with the people who need them.

## Learn more

Chapter 2 of the [Construction Screening Guidebook](/resources/construction-screening-guidebook) covers OSHA, state laws and DOT rules. Chapter 4 covers collection on the jobsite and post-incident timing.$a$, $a$/img/news/construction-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Construction Screening Guidebook cover$a$, 'Labb', 'published', '2026-07-18T12:00:00+00:00', $a$construction-screening-guidebook$a$),
($a$audit-workplace-drug-testing-program$a$, $a$Ten Common Drug Testing Program Failures, and How to Fix Them$a$, $a$A practical audit for manufacturers and other employers: the most common drug testing program failures and how to correct them.$a$, $a$Most drug testing programs were set up once and then left alone. Policies drift, staff change and shortcuts become habits. An annual audit catches the problems before a lawsuit or an incident does.

## Failures we see most often

- **An outdated policy** that does not reflect current state marijuana or prescription laws
- **Inconsistent testing reasons**, where some supervisors order reasonable suspicion tests and others never do
- **No trained collectors**, or training that was never documented
- **Collection areas without privacy** or security
- **Broken chain of custody**, with missing signatures or times
- **Reading results by eye**, with no record of what was seen
- **No medical review** of non-negative results before action is taken
- **Results stored with general HR files** instead of a confidential file
- **No random program** where the policy says there is one
- **Consequences applied unevenly** across shifts or sites

## How to fix them

Start with the policy, then train the people who follow it. Standardize collection with written steps, use an objective digital read such as [Labb Station](/labb-station), and store results in a system with access controls.

## Measure the results

Track turnaround time, test volume by reason, non-negative rates and how long post-incident tests take. Numbers show whether the fixes worked.

The [Manufacturing Screening Guidebook](/resources/manufacturing-screening-guidebook) includes a full audit chapter and a 25-question practice exam.$a$, $a$/img/news/manufacturing-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Manufacturing Screening Guidebook cover$a$, 'Labb', 'published', '2026-07-04T12:00:00+00:00', $a$manufacturing-screening-guidebook$a$),
($a$dot-vs-company-drug-testing-logistics$a$, $a$DOT vs. Company Drug Testing: What Logistics Employers Need to Know$a$, $a$The difference between DOT-required and company-policy drug testing for logistics, delivery and warehouse employers.$a$, $a$Logistics employers often run two drug testing programs at once: one required by the Department of Transportation for certain drivers, and one under their own company policy for everyone else. Mixing them up causes compliance problems.

## DOT testing

DOT rules apply to safety-sensitive transportation employees, such as drivers who need a commercial driver's license. These tests follow federal procedures in 49 CFR Part 40, including specific collection steps, a federally certified laboratory and review by a medical review officer. Rapid tests cannot be used for DOT-required drug tests.

## Company testing

Everyone else, including warehouse associates, forklift operators and delivery drivers who do not need a CDL, can be tested under company policy. Here you choose the panel, the specimen and the testing reasons, within state law. Rapid testing in-house is a common choice.

## Keep the programs separate

- Use separate forms and records for DOT and non-DOT tests
- Do not apply DOT procedures as a reason to skip your own policy, or the other way around
- Train supervisors to know which employees fall under which program

## Learn more

Chapter 2 of the [Logistics Screening Guidebook](/resources/logistics-screening-guidebook) covers DOT and company testing, state marijuana and prescription laws, and background check rules.$a$, $a$/img/news/logistics-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Logistics Screening Guidebook cover$a$, 'Labb', 'published', '2026-06-20T12:00:00+00:00', $a$logistics-screening-guidebook$a$),
($a$pre-employment-random-reasonable-suspicion-testing$a$, $a$Five Types of Workplace Drug Testing and When to Use Each$a$, $a$Pre-employment, random, reasonable suspicion, post-accident and return-to-duty testing explained for employers.$a$, $a$Most workplace drug testing programs use some combination of five testing reasons. Each has a different purpose and different rules.

## Pre-employment

Testing applicants after a conditional job offer. It is the most common test and sets expectations from day one. Apply it to every candidate for the same position.

## Random

Testing a set percentage of employees chosen by a neutral random process. Random testing is a strong deterrent, but selection must be truly random and documented. Some states restrict random testing to safety-sensitive roles.

## Reasonable suspicion

Testing when a trained supervisor observes specific, documented signs of possible impairment, such as slurred speech, the smell of alcohol or unsafe behavior. Documentation is everything: what was seen, when and by whom.

## Post-accident

Testing after an accident or incident. Time matters, because drugs and alcohol leave the body. Write clear criteria for which incidents lead to a test.

## Return to duty and follow-up

Testing an employee before they return after a policy violation, and periodically afterward if your policy allows.

## Put it in writing

Whatever reasons you use, your written policy should define each one and apply it consistently.

The [Employers Guidebook](/resources/employers-guidebook) covers each type of testing in detail, with real-world case scenarios.$a$, $a$/img/news/employers-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Employers Guidebook cover$a$, 'Labb', 'published', '2026-06-06T12:00:00+00:00', $a$employers-guidebook$a$),
($a$drug-testing-nurses-licensed-professionals$a$, $a$Drug Testing Licensed Professionals and Medical Staff$a$, $a$How healthcare employers handle drug testing for nurses, physicians, pharmacists and other licensed staff.$a$, $a$Licensed professionals bring added considerations to a workplace testing program: licensing boards, medical staff bylaws and monitoring programs all play a part.

## Employees and medical staff are different

Nurses and pharmacists are usually employees covered by your HR policy. Physicians may be employees or independent members of the medical staff covered by bylaws. Make sure your policy, or the bylaws, clearly cover each group.

## Prescriptions

Licensed staff may have legitimate prescriptions for medications that appear on a test. Non-negative results should be confirmed by a laboratory and reviewed by a medical review officer, who verifies prescriptions confidentially before a result is reported as positive.

## Reporting obligations

Some states require employers to report impaired practice to the licensing board. Know your state's rules before an incident happens.

## Alternatives to discipline

Many boards offer confidential monitoring programs that allow a professional to keep practicing under supervision. Your policy can explain how you work with them.

## Consistency

Hold every role to the same written standard. Inconsistent treatment of clinical and non-clinical staff creates legal risk.

Read more in the [Healthcare Edition guidebook](/resources/healthcare-screening-guidebook), which covers licensed professionals and running a program in a care setting.$a$, $a$/img/news/healthcare-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Employer Guidebook Healthcare Edition cover$a$, 'Labb', 'published', '2026-05-23T12:00:00+00:00', $a$healthcare-screening-guidebook$a$),
($a$alcohol-policy-restaurants-hotels-events$a$, $a$Alcohol on the Job: Setting Clear Rules for Service, Tasting and Events$a$, $a$How restaurants, hotels and event venues write alcohol rules for staff who serve, taste or work around alcohol.$a$, $a$In most workplaces the alcohol rule is simple: none on the job. In hospitality, staff pour drinks, taste wine, run bars and work events where alcohol flows. Clear rules protect guests, staff and your liquor license.

## Define the lines

Your policy should spell out:

- Whether tasting is allowed, for which roles and in what amounts
- Whether staff may drink at company events, and who decides
- That being impaired at work is never allowed, whatever the role
- Rules for drinking on property after a shift

## Train managers

Managers need to recognize signs of impairment and document what they see. A reasonable suspicion alcohol test should follow a documented observation, not a hunch.

## Testing for alcohol

Breath and saliva alcohol tests measure current alcohol levels and are suited to reasonable suspicion and post-incident testing. Some biomarker tests look back further and fit follow-up testing.

## Drivers and security

Staff who drive guests or work security need stricter rules, and drivers may fall under DOT requirements.

The [Hospitality Edition guidebook](/resources/hospitality-screening-guidebook) includes chapters on alcohol on the job and on drivers, security and other special roles.$a$, $a$/img/news/hospitality-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Employer Guidebook Hospitality Edition cover$a$, 'Labb', 'published', '2026-05-09T12:00:00+00:00', $a$hospitality-screening-guidebook$a$),
($a$reading-drug-test-package-inserts-cutoffs$a$, $a$Reading Drug Test Package Inserts: Cutoffs, Cross-Reactivity and Class Assays$a$, $a$How clinic staff read rapid drug test package inserts to understand cutoffs, cross-reactivity and class assays, and answer employer questions.$a$, $a$Every rapid drug test comes with a package insert. Most people never read it. For a clinic, the insert answers most of the questions employers and donors ask.

## Cutoffs

The insert lists the cutoff for each drug, the concentration at which the test turns non-negative. Different kits can have different cutoffs for the same drug.

## Cross-reactivity

The insert lists other substances that can trigger each drug zone and at what concentration. This explains why a donor taking a certain medication might screen non-negative, and why confirmation matters.

## Class assays

Some zones detect a class of drugs rather than one drug. An opiate zone may respond to several opiates at different concentrations. The insert shows which ones and how strongly.

## Using the insert with employers

When an employer asks why a test flagged a result, or whether a medication could cause it, the insert is your first reference. The final answer comes from laboratory confirmation and medical review.

## Keep inserts on file

Store the insert for every kit lot you use. It is part of your documentation if a result is challenged.

Browse every Labb kit with its drugs and cutoffs on the [test kits page](/test-kits). The [Clinic Owners Guidebook](/resources/clinic-owners-guidebook) has a full chapter on package inserts.$a$, $a$/img/news/clinic-owners-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Clinic Owners Guidebook cover$a$, 'Labb', 'published', '2026-04-25T12:00:00+00:00', $a$clinic-owners-guidebook$a$),
($a$fair-chance-hiring-ban-the-box$a$, $a$Fair Chance Hiring and Ban the Box: What Employers Need to Know$a$, $a$How fair chance and ban-the-box laws affect when and how employers consider criminal history in hiring.$a$, $a$Many states, counties and cities have fair chance hiring laws, often called ban the box. They change when an employer can ask about criminal history and how it may be used.

## Common requirements

- Removing criminal history questions from job applications
- Waiting until after an interview or conditional offer to run a criminal check
- Considering the nature of the offense, the time since it occurred and its relation to the job
- Giving the candidate a chance to explain before a final decision
- Extra notices beyond those required by the FCRA

## Individualized assessment

Federal equal employment guidance encourages employers to look at each record in context rather than apply blanket exclusions. Many fair chance laws require it.

## Rules change by location

The rules that apply depend on where the job is located and sometimes where the candidate lives. Employers hiring in several locations need a process that adapts.

## Build it into the process

The safest approach is to build fair chance steps into the hiring workflow so they happen every time.

Learn more in the [Background Screening Guidebook](/resources/background-screening-guidebook), and see the [background checks](/background-checks) Labb offers. This article is general information, not legal advice.$a$, $a$/img/news/employment-background-screening-guidebook-article.webp$a$, 1200, 750, $a$Background Screening Guidebook cover$a$, 'Labb', 'published', '2026-04-11T12:00:00+00:00', $a$background-screening-guidebook$a$),
($a$rapid-testing-vs-lab-testing-cost$a$, $a$In-House Rapid Testing vs. Straight-to-Lab: Which Costs Less?$a$, $a$How in-house rapid drug testing and straight-to-laboratory testing compare on cost, and when each model wins.$a$, $a$There are two main ways to run a drug testing program. Which one costs less depends on your volume, your positive rate and how much time matters.

## In-house rapid testing

Trained staff collect and screen on site. Negatives are final on site. Non-negatives go to a laboratory for confirmation and medical review.

- Lower cost when most results are negative
- Fast results and fewer hiring delays
- Requires trained collectors and a collection area

## Straight-to-laboratory testing

Every specimen goes to a laboratory, usually through a clinic.

- Predictable cost per test, often including confirmation
- No on-site staff or supplies to manage
- Slower results and travel time for employees

## Where the break-even sits

As the positive rate rises, rapid testing sends more specimens to the laboratory and the advantage shrinks. At low to moderate positive rates, rapid testing usually costs less. The specimen you choose affects the positive rate, which is why specimen choice is also a budget decision.

## Many employers use both

Rapid testing for pre-employment and post-incident, and laboratory testing for DOT or when a policy requires it.

The [Drug Testing Cost Guidebook](/resources/drug-testing-cost-guidebook) works through both models and the break-even rate.$a$, $a$/img/news/drug-testing-cost-guidebook-article.webp$a$, 1200, 750, $a$Drug Testing Cost Guidebook cover$a$, 'Labb', 'published', '2026-03-28T12:00:00+00:00', $a$drug-testing-cost-guidebook$a$),
($a$background-checks-construction-hiring-fcra$a$, $a$Background Checks for Construction Hiring: Matching Searches to the Role$a$, $a$How construction companies run background checks that fit each role, follow the FCRA and keep crews moving.$a$, $a$Construction hiring is fast, and many companies treat background checks as a box to tick. The better approach is to match the search to the job and run it through the same process as your drug test.

## Match the search to the role

Not every position needs the same check. A common way to think about it:

- **Field crews:** criminal history in the counties where the candidate has lived, and the sex offender registry
- **Drivers and equipment operators:** add a motor vehicle record, and federal rules for commercial drivers
- **Office, finance and purchasing roles:** add employment and education verification

## Follow the FCRA steps

When an employer uses a screening company to run a background check for hiring, the Fair Credit Reporting Act sets the steps:

- Give the candidate a standalone written disclosure and get written authorization
- If you may decide against the candidate because of the report, send a pre-adverse action notice with a copy of the report and a summary of their rights
- Give the candidate time to respond, then send an adverse action notice if you make a final decision

State and local laws can add steps, including fair chance hiring rules that limit when you can ask about criminal history.

## One process, not two

When drug testing and background checks run through one system, candidates move faster and nothing falls through the cracks. Labb offers [background checks](/background-checks) alongside drug testing, ordered and tracked in the same place.

## Learn more

Chapter 5 of the [Construction Screening Guidebook](/resources/construction-screening-guidebook) covers the FCRA process step by step, searches by construction role and fair chance hiring.$a$, $a$/img/news/construction-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Construction Screening Guidebook cover$a$, 'Labb', 'published', '2026-03-14T12:00:00+00:00', $a$construction-screening-guidebook$a$),
($a$choosing-drug-test-panel-specimen-manufacturing$a$, $a$Choosing a Drug Test Panel and Specimen for Your Plant$a$, $a$How manufacturers choose the right drug panel and specimen type, from urine to oral fluid, for each testing reason.$a$, $a$Two choices shape every drug test: which drugs you test for and which specimen you collect. Getting them right keeps the program effective without paying for tests that add little value.

## The panel

A panel is the list of drugs on the test. Common workplace panels range from five to a dozen or more drugs. Consider:

- What is showing up in your area and industry
- Safety-sensitive roles such as forklift and machine operators
- State laws on marijuana and what your policy says about it
- Prescription medications such as opioids and benzodiazepines

The [Labb drug profiles](/drugs) explain each drug on Labb tests with a priority index to help decide what belongs on your panel.

## The specimen

- **Urine** is the most common and looks back over a period of days
- **Oral fluid** is collected in plain view, which makes cheating harder, and is best at detecting recent use, which suits post-incident and reasonable suspicion testing
- **Hair** covers the longest history and is usually sent to a laboratory

Many plants use urine for pre-employment and oral fluid for post-incident testing.

## Keep it consistent

Whatever you choose, write it into the policy and apply it the same way across shifts and sites.

See every Labb kit, drug and cutoff on the [test kits page](/test-kits), and read chapter 3 of the [Manufacturing Screening Guidebook](/resources/manufacturing-screening-guidebook) for testing reasons, panels and specimens.$a$, $a$/img/news/manufacturing-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Manufacturing Screening Guidebook cover$a$, 'Labb', 'published', '2026-02-28T12:00:00+00:00', $a$manufacturing-screening-guidebook$a$),
($a$objective-digital-drug-test-reader$a$, $a$Why an Objective Digital Reader Beats Reading Drug Tests by Eye$a$, $a$Reading rapid drug tests by eye leads to inconsistent results. Here is how a digital reader makes on-site testing objective and documented.$a$, $a$A rapid drug test shows its result as lines on a strip. Reading those lines by eye sounds simple, but it is where many in-house programs run into trouble.

## The problem with reading by eye

- Faint lines are read differently by different people
- Lighting, time and fatigue all affect what a person sees
- There is no record of what the line looked like at the time
- In a dispute, it is one person's word against another's

## What a digital reader does

A digital reader such as [Labb Station](/labb-station) uses a phone or tablet camera to capture the test and read the result the same way every time. It records the result with the donor, kit, time and collector, so the documentation is complete.

## Why it matters in logistics

With many collectors across shifts and sites, consistency is hard. A digital reader gives every site the same standard and gives managers one place to see results.

## Results are still screens

A rapid test is a screen. A non-negative result is sent to a laboratory for confirmation and medical review before any decision is made.

## Learn more

Chapter 6 of the [Logistics Screening Guidebook](/resources/logistics-screening-guidebook) explains how rapid tests are read and answers common objections. See which [Labb kits](/test-kits) work with the reader.$a$, $a$/img/news/logistics-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Logistics Screening Guidebook cover$a$, 'Labb', 'published', '2026-02-14T12:00:00+00:00', $a$logistics-screening-guidebook$a$),
($a$urine-vs-oral-fluid-vs-hair-drug-testing$a$, $a$Urine, Oral Fluid or Hair: Choosing a Drug Test Specimen$a$, $a$How urine, oral fluid and hair drug tests compare on detection window, collection and cost, and which fits each testing reason.$a$, $a$The specimen you collect affects what the test can find, how hard it is to cheat and what it costs. Here is how the three common workplace specimens compare.

## Urine

- The most widely used workplace specimen
- Detects use over roughly the past several days for most drugs, longer for regular marijuana use
- Collected in private, so collection procedures matter to prevent tampering
- Available as rapid tests and laboratory tests

## Oral fluid

- Collected in plain view, which makes substitution much harder
- Best at detecting recent use, often within the past day or two
- A good fit for post-accident and reasonable suspicion testing
- Available as rapid tests and laboratory tests

## Hair

- Covers the longest history, often about 90 days
- Not suited to detecting very recent use
- Usually sent to a laboratory

## Which one fits

Many employers use urine or oral fluid for pre-employment and random testing and oral fluid after an incident. Choosing a specimen also affects your positive rate and your budget.

See all Labb [urine and oral fluid kits](/test-kits), and read the specimens chapter of the [Employers Guidebook](/resources/employers-guidebook).$a$, $a$/img/news/employers-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Employers Guidebook cover$a$, 'Labb', 'published', '2026-01-31T12:00:00+00:00', $a$employers-guidebook$a$),
($a$drug-testing-hospital-shifts-units$a$, $a$Running a Drug Testing Program Across Hospital Shifts and Units$a$, $a$Practical steps for hospitals and long-term care employers to run drug testing across 24-hour shifts, units and locations.$a$, $a$Hospitals, long-term care and home health never close. A testing program that only works during business hours leaves gaps when they matter most.

## Plan for every shift

- Train collectors on day, evening and night shifts
- Keep supplies and a private collection area available around the clock
- Give house supervisors a clear process for reasonable suspicion testing at any hour

## Patient care comes first

Removing a staff member from the floor for testing must not leave patients without coverage. Your procedure should include who covers the assignment.

## Multiple locations

Clinics, satellite sites and home health teams need the same policy and process. A single system for ordering and recording tests keeps every location consistent.

## Faster results

Rapid tests on site give negative results in minutes, so new hires start on time and a reasonable suspicion test does not wait for the morning. Non-negatives still go to a laboratory and a medical review officer.

## Confidentiality

Keep results in a confidential file with limited access, separate from general personnel records.

The [Healthcare Edition guidebook](/resources/healthcare-screening-guidebook) covers shifts, units and the realities of a care environment.$a$, $a$/img/news/healthcare-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Employer Guidebook Healthcare Edition cover$a$, 'Labb', 'published', '2026-01-17T12:00:00+00:00', $a$healthcare-screening-guidebook$a$),
($a$reasonable-suspicion-testing-managers-hospitality$a$, $a$Reasonable Suspicion Testing: A Guide for Hospitality Managers$a$, $a$How hotel and restaurant managers recognize signs of impairment, document them and order a reasonable suspicion test the right way.$a$, $a$A reasonable suspicion test is only as strong as the observation behind it. In a fast-moving kitchen or front desk, managers need a simple, consistent process.

## Recognize the signs

Look for specific, observable signs, such as:

- Slurred speech, unsteady movement or the smell of alcohol
- Unusual behavior, confusion or sudden mood changes
- Errors, near misses or an incident
- Drugs or paraphernalia on the person or in their area

## Document what you saw

Write down what you observed, when and where, and who else saw it. Have a second manager confirm when possible. Avoid opinions and diagnoses; record facts.

## Remove the person from duty

Take the employee off the floor and do not let them drive. Arrange safe transport if needed.

## Test promptly

Collect the specimen as soon as possible. On-site testing with a trained collector avoids delays.

## Follow the policy

Apply the consequences in your written policy, the same way for every employee.

The [Hospitality Edition guidebook](/resources/hospitality-screening-guidebook) covers signs of use, handling results and case scenarios you will face.$a$, $a$/img/news/hospitality-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Employer Guidebook Hospitality Edition cover$a$, 'Labb', 'published', '2026-01-03T12:00:00+00:00', $a$hospitality-screening-guidebook$a$),
($a$grow-clinic-employer-drug-testing-accounts$a$, $a$How Clinics Grow Employer Drug Testing Accounts$a$, $a$Practical ways clinics and collection sites win and keep employer drug testing accounts by running a professional program.$a$, $a$Employers choose a clinic for convenience and keep it for quality. Clinics that run collections and rapid testing to a professional standard win more employer accounts and keep them longer.

## Be fast

Employers want new hires to start quickly. Rapid testing on site gives negative results in minutes. Walk-in availability and extended hours matter.

## Be consistent

Written procedures, trained collectors and an objective digital read mean every donor gets the same process. Employers notice when results are documented clearly.

## Be the expert

Employers have questions about policy, marijuana laws, specimens and results. Clinic staff who can answer them, or point to the right resource, become a trusted advisor rather than a vendor.

## Offer more

Employers prefer one provider for drug testing, background checks and on-site services. Adding [background checks](/background-checks) and on-site collections increases revenue per account.

## Partner with Labb

The [Channel Partner Program](/channel-partner-program) gives clinics products, technology and business development support to grow employer accounts.

The [Clinic Owners Guidebook](/resources/clinic-owners-guidebook) is the training manual for running a professional testing service.$a$, $a$/img/news/clinic-owners-drug-testing-guidebook-article.webp$a$, 1200, 750, $a$Clinic Owners Guidebook cover$a$, 'Labb', 'published', '2025-12-20T12:00:00+00:00', $a$clinic-owners-guidebook$a$),
($a$common-employment-background-check-searches$a$, $a$A Guide to Common Employment Background Check Searches$a$, $a$What employment background check searches cover, from criminal records and identity to employment, education and driving records.$a$, $a$A background check is a set of searches, each answering a different question. Choosing the right ones for a role keeps screening useful and fair.

## Identity

An identity trace confirms the candidate's identity and lists names and addresses associated with them, which tells the screener where to search for records.

## Criminal records

- **County searches** check court records where the candidate has lived
- **Statewide searches** cover the states that offer them
- **Federal searches** cover federal court records
- **Multi-jurisdictional database** searches cast a wide net and are verified at the source
- **Sex offender registry** searches

## Verifications

- **Employment verification** confirms past employers, dates and titles
- **Education verification** confirms degrees and attendance
- **Professional licenses** confirm a license is active and in good standing

## Driving records

A motor vehicle record shows license status and violations, for roles that drive.

## Other searches

Credit reports, where allowed and relevant, and other specialized searches have extra rules.

See all of the [background checks](/background-checks) Labb offers, and read the [Background Screening Guidebook](/resources/background-screening-guidebook) for every major workplace search explained.$a$, $a$/img/news/employment-background-screening-guidebook-article.webp$a$, 1200, 750, $a$Background Screening Guidebook cover$a$, 'Labb', 'published', '2025-12-06T12:00:00+00:00', $a$background-screening-guidebook$a$),
($a$drug-testing-budget-planning$a$, $a$How to Build a Drug Testing Budget$a$, $a$A step-by-step method for employers and clinics to plan and control a drug testing budget.$a$, $a$A drug testing budget is easy to underestimate. Here is a simple way to plan it.

## 1. Estimate volume

Count expected tests by reason: pre-employment from your hiring plan, random from your selection rate, plus an allowance for post-incident and reasonable suspicion tests.

## 2. Choose specimen and model

Decide on urine or oral fluid, rapid or laboratory, for each testing reason. This sets your price per screen.

## 3. Estimate the positive rate

Use your past results or a planning range for your industry and specimen. The positive rate sets how many tests need confirmation and medical review.

## 4. Add confirmation and review

Multiply expected non-negatives by the cost to confirm and review each one.

## 5. Add the fixed costs

Collector training, supplies, a reader, software and administration time.

## 6. Track and adjust

Compare actual volume, positive rate and cost per test each quarter. Adjust the plan when hiring or results change.

## Control the cost

- Use rapid testing where most results are negative
- Choose the right specimen for each reason
- Reduce delays that cost productive hours

The [Drug Testing Cost Guidebook](/resources/drug-testing-cost-guidebook) includes budgeting tools to plan and manage the testing budget.$a$, $a$/img/news/drug-testing-cost-guidebook-article.webp$a$, 1200, 750, $a$Drug Testing Cost Guidebook cover$a$, 'Labb', 'published', '2025-11-22T12:00:00+00:00', $a$drug-testing-cost-guidebook$a$)
on conflict (slug) do nothing;
