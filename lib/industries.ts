export type Industry = {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  lede: string;
  facts: string[];
  reasons: { title: string; body: string }[];
  kitSlugs: string[];
  handbook?: string; // resource slug
  faqs: { q: string; a: string }[];
};

export const industries: Industry[] = [
  {
    slug: "construction",
    name: "Construction",
    metaTitle: "Construction Drug Testing On the Jobsite",
    metaDescription:
      "Rapid oral fluid and urine drug testing for construction companies. Test on the jobsite, get results in minutes and keep crews working. Free construction screening handbook.",
    eyebrow: "Drug testing for construction",
    h1: "Test on the jobsite. Keep crews working.",
    lede:
      "Bring drug screening to the trailer, the office or the site. Results in minutes, an objective digital read and a time-stamped record, without sending people across town to a clinic.",
    facts: [
      "Oral fluid screens collect anywhere, no restroom needed",
      "Results in 5 to 10 minutes, documented automatically",
      "Fast post-incident testing with a time-stamped record",
      "Non-negatives go to the lab for confirmation in one step",
    ],
    reasons: [
      {
        title: "Hire before the next site does",
        body: "Test during orientation instead of waiting on a clinic appointment, so good candidates start on Monday.",
      },
      {
        title: "Test right after an incident",
        body: "Collect on site within minutes of an incident, while the timing still matters, with an electronic record of when it happened.",
      },
      {
        title: "No restroom required",
        body: "Oral fluid is collected in plain view, which suits jobsites, trailers and remote work.",
      },
      {
        title: "Fewer hours off the job",
        body: "No drive to a clinic and back. Workers test and return to the crew.",
      },
    ],
    kitSlugs: ["orf-31c-oraflo", "or-14a-etest-swab", "ua-13a-svt"],
    handbook: "construction-screening-handbook",
    faqs: [
      {
        q: "Can construction companies run their own drug tests?",
        a: "Yes, for company (non-DOT) testing. Many contractors run rapid screens in-house with a written policy, trained collectors and lab confirmation of every non-negative. Drivers covered by DOT rules must still be tested under the DOT program.",
      },
      {
        q: "Is oral fluid or urine better for a jobsite?",
        a: "Oral fluid is collected in plain view with no restroom and shows recent use, which makes it strong for post-incident and reasonable suspicion testing. Urine has a longer detection window and wider panels, which suits pre-employment.",
      },
      {
        q: "What happens with a non-negative result?",
        a: "A rapid screen is preliminary. Every non-negative is sent to a laboratory for confirmation and Medical Review Officer review before any decision is made.",
      },
    ],
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    metaTitle: "Drug Testing for Manufacturers",
    metaDescription:
      "In-house rapid drug testing for manufacturing plants. Cut hiring delays and downtime with oral fluid and urine screens and an objective digital read. Free manufacturing screening handbook.",
    eyebrow: "Drug testing for manufacturing",
    h1: "Screen at the plant. Keep the line running.",
    lede:
      "Run rapid drug screening at your facility on every shift. An objective digital read, results in minutes and records your auditors and customers can follow.",
    facts: [
      "Test during orientation, on any shift",
      "Oral fluid or urine, including panels with alcohol",
      "Consistent, objective results for every person",
      "Electronic records, no paper forms to chase",
    ],
    reasons: [
      {
        title: "Less downtime",
        body: "No trip to an outside clinic. Employees test on site and get back to the line.",
      },
      {
        title: "Ready for audits",
        body: "Every result is time-stamped and stored against the donor record, ready for customer and insurer audits.",
      },
      {
        title: "Staffing agency workers covered",
        body: "Screen temporary and agency workers on arrival with the same process you use for direct hires.",
      },
      {
        title: "A fair read, every time",
        body: "The same criteria applied to every device and every donor protects the employee, the employer and the collector.",
      },
    ],
    kitSlugs: ["ua-13a-svt", "ua-16c-svt", "orf-31c-oraflo"],
    handbook: "manufacturing-screening-handbook",
    faqs: [
      {
        q: "What drug panel should a manufacturer use?",
        a: "It depends on your policy, your state and the roles you fill. Many plants use a 10 to 13 drug urine panel for pre-employment and an oral fluid screen for post-incident testing. A Labb specialist can recommend a panel for your program.",
      },
      {
        q: "How long do rapid drug test results take?",
        a: "Urine cups read in 5 minutes and oral fluid devices in 3 to 10 minutes. Results are captured digitally and documented automatically.",
      },
      {
        q: "Do we need a lab?",
        a: "Yes, for confirmation. Rapid screens give a preliminary result. Non-negatives go to a laboratory for confirmation and Medical Review Officer review.",
      },
    ],
  },
  {
    slug: "logistics-warehousing",
    name: "Logistics and warehousing",
    metaTitle: "Drug Testing for Logistics and Warehousing",
    metaDescription:
      "Rapid on-site drug testing for warehouses and distribution centers. Hire faster, test after incidents in minutes and keep the dock moving.",
    eyebrow: "Drug testing for logistics and warehousing",
    h1: "Test on site. Hire faster. Keep the dock moving.",
    lede:
      "Put rapid drug testing inside your warehouse or distribution center. Results in minutes, an objective digital read and a record created the moment the test is read.",
    facts: [
      "Results in 5 to 10 minutes, during orientation or on any shift",
      "Oral fluid or urine, including panels with alcohol",
      "An objective digital read, free from guesswork",
      "Non-negatives go to the lab for confirmation in one step",
    ],
    reasons: [
      {
        title: "Keep candidates moving",
        body: "Test during orientation instead of waiting on a clinic appointment, so good hires don't walk to the next warehouse.",
      },
      {
        title: "Test right after an incident",
        body: "Forklift, dock or equipment incident? Collect in minutes, on site, with a time-stamped electronic record.",
      },
      {
        title: "Every site, every shift",
        body: "The LabbHR reader runs on a phone or tablet, so nights, weekends and remote buildings are covered.",
      },
      {
        title: "Fully managed option",
        body: "Don't want your staff running tests? Labb can proctor collections remotely so your team doesn't handle the process.",
      },
    ],
    kitSlugs: ["orf-31c-oraflo", "or-14a-etest-swab", "ua-06b-svt", "ua-13a-svt"],
    faqs: [
      {
        q: "Can we test drivers with Labb rapid screens?",
        a: "Labb rapid screens are for company (non-DOT) testing. Drivers covered by DOT rules must still be tested under the DOT program.",
      },
      {
        q: "How does on-site testing work across multiple shifts?",
        a: "Trained staff on each shift collect with a Labb device and read it with the LabbHR app on a phone or tablet. Results are stored centrally, so HR sees every location in one place.",
      },
      {
        q: "What does on-site drug testing cost?",
        a: "Cost depends on the panel, specimen and volume. Request a quote and a Labb specialist will price your program.",
      },
    ],
  },
];

export const getIndustry = (slug: string) => industries.find((i) => i.slug === slug);
