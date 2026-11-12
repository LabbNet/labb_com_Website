// Audience segments used by the lead form, lead routing and the admin area.
// Shared by client and server code, so keep this file free of server-only imports.

export const SEGMENTS = [
  { value: "laboratory", label: "Laboratory", short: "Laboratory" },
  { value: "tpa", label: "Third party administrator (TPA)", short: "TPA" },
  { value: "collection-site", label: "Collection site or clinic", short: "Collection site" },
  { value: "employer", label: "Employer testing my own employees", short: "Employer" },
  { value: "treatment", label: "Treatment or recovery program", short: "Treatment and recovery" },
  { value: "corrections", label: "Corrections agency (probation, parole, jail)", short: "Corrections" },
  { value: "drug-testing-business", label: "MRO, national account or other drug testing business", short: "Other drug testing business" },
  { value: "individual", label: "Individual ordering a test for myself", short: "Individual (Quick Test)" },
  { value: "other", label: "Other", short: "Other" },
] as const;

export type Segment = (typeof SEGMENTS)[number]["value"];

export const isSegment = (v: unknown): v is Segment => SEGMENTS.some((s) => s.value === v);
export const segmentLabel = (v: string | null | undefined) => SEGMENTS.find((s) => s.value === v)?.short || "Other";

// What each segment is routed to (shown in the admin area and the notification email).
export const SEGMENT_PATH: Record<Segment, string> = {
  laboratory: "LabbHR and One by Labb consultation (laboratory)",
  tpa: "LabbHR and One by Labb consultation (TPA)",
  treatment: "Treatment and recovery inquiry",
  individual: "Quick Test order: ship kit overnight and schedule proctoring",
  "collection-site": "Clinic wants Labb technology in its facility",
  employer: "CPP lead generation (company needs drug testing)",
  corrections: "LabbPO and Labb Station consultation",
  "drug-testing-business": "LabbHR and One by Labb consultation",
  other: "General inquiry",
};

export const PRODUCTS = ["Labb Station", "LabbHR", "LabbPO", "Test kits", "Training", "Channel Partner Program"] as const;

export const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];
export const isStatus = (v: unknown): v is LeadStatus => LEAD_STATUSES.some((s) => s.value === v);
export const statusLabel = (v: string) => LEAD_STATUSES.find((s) => s.value === v)?.label || v;

export const VOLUME = ["Under 25 tests or offenders a month", "25 to 100", "100 to 500", "500+"];
