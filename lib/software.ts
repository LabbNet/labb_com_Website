// Labb Station vs LabbHR. Labb is offering these as two separate software options (Nov 2026).
// Feature split and availability are drafts for James to confirm before launch.

export type Cell = true | false | string;

export const software = {
  station: {
    name: "Labb Station",
    href: "/labb-station",
    tagline: "The rapid test reader",
    summary:
      "Read Labb rapid drug tests on a phone or tablet. Every result gets the same objective read, is time-stamped and is saved to the donor record.",
    bestFor: "Clinics, collection sites and employers that run rapid tests and want an objective, documented read.",
    status: "Available now",
  },
  hr: {
    name: "LabbHR",
    href: "/labbhr",
    tagline: "The screening platform",
    summary:
      "Everything in Labb Station, plus lab testing, confirmations, MRO results and background checks in one record per candidate, built for HR teams.",
    bestFor: "Employers and clinics managing the whole screening process: rapid tests, lab tests and background checks.",
    status: "Early access",
  },
};

export const comparison: { group: string; rows: { feature: string; station: Cell; hr: Cell }[] }[] = [
  {
    group: "Rapid testing",
    rows: [
      { feature: "Read Labb urine and oral fluid rapid tests on a phone or tablet", station: true, hr: true },
      { feature: "Objective digital read, the same criteria for every donor", station: true, hr: true },
      { feature: "Results time-stamped and saved to the donor record", station: true, hr: true },
      { feature: "True Privacy: masked OraFlo drug names decoded privately", station: true, hr: true },
      { feature: "Guided collection steps that prevent common errors", station: true, hr: true },
      { feature: "Send non-negatives to the lab with scannable decals", station: true, hr: true },
    ],
  },
  {
    group: "Accounts and access",
    rows: [
      { feature: "Manager, rep, collector and organization dashboards", station: true, hr: true },
      { feature: "Multiple locations under one organization", station: true, hr: true },
      { feature: "Candidate status view for HR teams", station: false, hr: true },
    ],
  },
  {
    group: "Lab testing and results",
    rows: [
      { feature: "Order lab-based tests with an electronic chain of custody (eCCF)", station: false, hr: true },
      { feature: "Lab confirmation and MRO results in the same record", station: false, hr: true },
      { feature: "One record per candidate, from screen to final result", station: false, hr: true },
    ],
  },
  {
    group: "Background screening",
    rows: [
      { feature: "Order background checks", station: false, hr: true },
      { feature: "Drug test and background check results together", station: false, hr: true },
    ],
  },
  {
    group: "Coming next",
    rows: [{ feature: "Proctored testing kiosks", station: false, hr: "2027" }],
  },
];
