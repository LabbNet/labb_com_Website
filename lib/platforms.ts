// Labb's three software platforms. One rule the whole site uses:
// Labb Station runs the test, LabbHR runs the business, LabbPO runs the caseload.
// Write product facts here once; segment and product pages reuse them.

export type Cell = true | false | string;

export const platforms = {
  station: {
    key: "station",
    name: "Labb Station",
    href: "/labb-station",
    rule: "Runs the test",
    tagline: "Objective rapid test reader and documentation system",
    summary:
      "Read every rapid drug test objectively on a phone or tablet, document every collection, build custom panels with Flex Testing, and send to the lab with one button.",
    builtFor: "Organizations that conduct tests: collection sites, employers testing in-house and corrections.",
    status: "Available now",
    cta: { href: "/contact", label: "Request a consultation" },
  },
  hr: {
    key: "hr",
    name: "LabbHR",
    href: "/labbhr",
    rule: "Runs the business",
    tagline: "Business development platform for drug testing companies",
    summary:
      "Sales, marketing, contracting and accounting in one platform, plus everything in Labb Station, expanded connectivity and access to the One by Labb ecosystem.",
    builtFor: "Drug testing businesses that want to grow: collection sites, national accounts, TPAs, laboratories and MROs.",
    status: "Now in beta",
    cta: { href: "/labbhr#beta", label: "Join the beta" },
  },
  po: {
    key: "po",
    name: "LabbPO",
    href: "/labbpo",
    rule: "Runs the caseload",
    tagline: "Offender management for corrections",
    summary:
      "Random selection, offender notification, test tracking, officer and offender coordination, online fee collection and a guaranteed result system, all fully remote.",
    builtFor: "Probation, parole, jails and other corrections departments.",
    status: "Available now",
    cta: { href: "/labbpo#demo", label: "Request a consultation" },
  },
  md: {
    key: "md",
    name: "LabbMD",
    href: "/labbmd",
    rule: "Runs the program",
    tagline: "Platform for treatment and recovery",
    summary: "The platform for clinical, treatment and recovery programs.",
    builtFor: "Treatment centers and recovery programs.",
    status: "Available now",
    cta: { href: "/labbmd", label: "Learn more" },
  },
} as const;

export const LABBPO_LICENSE = "LabbPO is licensed from LabbMD, Inc.";
export const LABBMD_LICENSE = "LabbMD is licensed from LabbMD, Inc.";

// /compare: Labb Station vs LabbHR, feature by feature (from the website strategy, Nov 11, 2026).
export const stationVsHr: { group: string; rows: { feature: string; station: Cell; hr: Cell }[] }[] = [
  {
    group: "Run the testing",
    rows: [
      { feature: "Objective rapid test reader on a phone or tablet", station: true, hr: true },
      { feature: "Every collection documented, with the image on file", station: true, hr: true },
      { feature: "Flex Testing: custom rapid and lab panels from one kit", station: true, hr: true },
      { feature: "Lab ordering and one-button send to lab", station: true, hr: true },
      { feature: "Electronic chain of custody (eCCF) for rapid and non-regulated lab tests", station: true, hr: true },
      { feature: "Electronic chain of custody (eCCF) for regulated testing", station: "Coming 2027", hr: "Coming 2027" },
      { feature: "Background screening", station: "Coming 2027", hr: "Coming 2027" },
    ],
  },
  {
    group: "Run the business",
    rows: [
      { feature: "Sales tools", station: false, hr: true },
      { feature: "Marketing tools", station: false, hr: true },
      { feature: "Contracting", station: false, hr: true },
      { feature: "Accounting", station: false, hr: true },
    ],
  },
  {
    group: "Save on lab testing",
    rows: [{ feature: "Discounted lab testing rates", station: false, hr: true }],
  },
  {
    group: "Connect",
    rows: [
      { feature: "Expanded connectivity and more technology", station: false, hr: true },
      { feature: "Access to the One by Labb ecosystem", station: false, hr: true },
    ],
  },
];

// LabbPO capabilities (product page, corrections hub, platforms overview).
export const labbpo = {
  highlights: [
    {
      t: "Fee collection",
      b: "Offenders pay testing fees and probation or state fees online. Labb can process offender payments for departments that want it.",
    },
    {
      t: "Guaranteed result system",
      b: "Collection sites must record a no-show, so a site that fails to enter data shows as a site failure, not offender non-compliance.",
    },
    {
      t: "100% remote management",
      b: "Officers see where and when each offender tests, the results, notes and notification logs, and meet by tele-visit, from anywhere.",
    },
  ],
  notify: ["SMS", "Email", "Phone call", "Text-in", "Web app"],
  officer: [
    "Where and when each offender tests, and the results",
    "In-platform tele-visits",
    "Case notes",
    "Notification logs for every offender",
    "Caseloads loaded by file, with API access",
  ],
  portal: [
    "Find a testing site",
    "View results",
    "Dispute past tests",
    "Check whether a test is scheduled",
    "Message their officer",
    "Manage payments",
  ],
  security: [
    "Hosted on AWS",
    "Database encrypted at rest (AES-256)",
    "Audit records kept six years",
    "Optional multi-factor sign in for officers",
  ],
};

// /find-your-platform: the clinic feature checklist. "hr" features need LabbHR; "station" features are in both.
export type FinderFeature = { id: string; label: string; help?: string; tier: "station" | "hr" };
export const finderGroups: { group: string; blurb: string; items: FinderFeature[] }[] = [
  {
    group: "Run every test",
    blurb: "Included in Labb Station and LabbHR.",
    items: [
      { id: "reader", label: "Objective rapid test reader", help: "Read every rapid drug test on a phone or tablet, the same way every time.", tier: "station" },
      { id: "documentation", label: "Every collection documented", help: "ID, steps and the test image kept on file for every donor.", tier: "station" },
      { id: "guided", label: "Guided collection steps", help: "Scan the ID, collect, capture the kit and get the result, step by step.", tier: "station" },
      { id: "flex", label: "Flex Testing", help: "Custom rapid and lab panels from one kit.", tier: "station" },
      { id: "send-to-lab", label: "Lab ordering and one-button send to lab", tier: "station" },
      { id: "eccf", label: "Electronic chain of custody (eCCF)", help: "For rapid and non-regulated lab tests.", tier: "station" },
      { id: "own-device", label: "Use our own phones and tablets", tier: "station" },
    ],
  },
  {
    group: "Save on lab testing",
    blurb: "Included with LabbHR.",
    items: [
      { id: "lab-discounts", label: "Discounted lab testing rates", help: "LabbHR clinics get Labb's discounted pricing on lab tests.", tier: "hr" },
    ],
  },
  {
    group: "Grow the business",
    blurb: "Included with LabbHR.",
    items: [
      { id: "sales", label: "Sales tools", help: "Find, track and close new employer clients and programs.", tier: "hr" },
      { id: "marketing", label: "Marketing campaigns", help: "Reach employers and partners with campaigns built for drug testing businesses.", tier: "hr" },
      { id: "contracting", label: "Contracting", help: "Send, sign and manage client agreements in the platform.", tier: "hr" },
      { id: "accounting", label: "Billing and accounting", help: "Bill clients and track what's owed without a separate system.", tier: "hr" },
      { id: "background", label: "Background checks", help: "Offer background screening from the same platform.", tier: "hr" },
    ],
  },
  {
    group: "Connect and scale",
    blurb: "Included with LabbHR.",
    items: [
      { id: "multi-site", label: "Manage multiple locations or national accounts", help: "Coordinate testing across sites and partners in one place.", tier: "hr" },
      { id: "connectivity", label: "Expanded connectivity and integrations", tier: "hr" },
      { id: "one", label: "Access to the One by Labb ecosystem", help: "Work with the TPAs, sites and employers in the Labb network.", tier: "hr" },
    ],
  },
];
