// Gated resources. The landing page (summary, chapters) is public and indexable for SEO.
// The file URL is only sent to the browser after the lead form is submitted (see /api/lead).

export type Resource = {
  slug: string;
  title: string;
  shortTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  lede: string;
  cover: string;
  coverW: number;
  coverH: number;
  facts: string[];
  chapters: { title: string; body: string }[];
  audience: { title: string; body: string }[];
  fileUrl: string; // never rendered on the public page
  industry?: string;
};

export const resources: Resource[] = [
  {
    slug: "construction-screening-handbook",
    title: "LabbHR Construction Screening Handbook",
    shortTitle: "Construction Screening Handbook",
    metaDescription:
      "Free handbook for construction companies: bring drug and background screening in-house. 9 chapters on law, policy, collection, background checks and moving testing in-house.",
    eyebrow: "Free handbook for construction companies",
    h1: "Bring drug and background screening in-house, and do it right.",
    lede: "A practical training guide for owners, safety managers and HR teams who want faster results and fewer jobsite delays, without cutting corners on compliance.",
    cover: "/img/construction-handbook.webp",
    coverW: 913,
    coverH: 1000,
    facts: [
      "9 chapters, about 80 pages",
      "Drug testing and background checks together",
      "25-question certification practice exam",
      "Tools and checklists you can use right away",
    ],
    chapters: [
      { title: "Why screening matters in construction", body: "The risk on the jobsite, what a program protects, and how in-house testing compares with sending people out." },
      { title: "The laws and rules", body: "DOT and company testing, OSHA and post-incident testing, state laws, marijuana and prescriptions, unions, and the federal rules for background checks." },
      { title: "Your written policy", body: "What it must cover, testing reasons for construction, choosing a panel and specimen, and fair, consistent consequences." },
      { title: "Drug testing best practices", body: "Roles, collection areas at the office and on the jobsite, collection steps, non-negative results, post-incident timing and confidentiality." },
      { title: "Background screening best practices", body: "The FCRA process step by step, searches by construction role, fair chance hiring, and one combined hiring process." },
      { title: "Reading the result", body: "Why an objective digital read matters, how the reader works, and answers to common objections." },
      { title: "Moving testing in-house", body: "A step-by-step plan to switch from an outside clinic, or to tighten up the program you already run." },
      { title: "Working with Labb and partner clinics", body: "How Labb and its partner clinics help you set up, certify your people and keep the program running." },
      { title: "Certification practice exam", body: "25 questions to check your team's readiness before online certification." },
    ],
    audience: [
      { title: "Owners and executives", body: "Cut hiring delays and the cost of sending people off site." },
      { title: "Safety managers", body: "Test fast after an incident, with a documented result." },
      { title: "HR and office managers", body: "Run drug tests and background checks through one compliant process." },
    ],
    fileUrl: "https://drive.google.com/file/d/1xBMS1eTKKNCWkasTrY3LKS-fCS2FoMiI/view",
    industry: "construction",
  },
  {
    slug: "manufacturing-screening-handbook",
    title: "LabbHR Manufacturing Screening Handbook",
    shortTitle: "Manufacturing Screening Handbook",
    metaDescription:
      "Free handbook for manufacturers: run drug and background screening in-house. 9 chapters, 79 pages, with a certification practice exam.",
    eyebrow: "Free handbook for manufacturers",
    h1: "Bring drug and background screening in-house, and do it right.",
    lede: "A practical training guide for owners, HR teams, program administrators, collectors and supervisors who want faster results and less downtime, without cutting corners on compliance.",
    cover: "/img/manufacturing-handbook.webp",
    coverW: 935,
    coverH: 1210,
    facts: [
      "9 chapters, 79 pages",
      "Drug testing and background checks together",
      "25-question certification practice exam",
      "Tools and checklists you can use right away",
    ],
    chapters: [
      { title: "Why screening matters in manufacturing", body: "The risk on the plant floor, what a program protects, and outsourced versus in-house testing." },
      { title: "The laws and rules", body: "DOT drivers and company testing, staffing agency workers, OSHA and post-incident testing, state marijuana laws, prescriptions, unions and customer contracts." },
      { title: "Your written policy", body: "What it must cover, testing reasons for manufacturing, choosing a panel and specimen, and consequences and second chances." },
      { title: "Drug testing best practices", body: "Roles, setting up a collection area, performing a collection, non-negative results, post-incident timing and confidentiality." },
      { title: "Background screening best practices", body: "The process step by step, matching searches to manufacturing roles and fair chance hiring." },
      { title: "Reading the result", body: "How a rapid test is read, why an objective digital read matters, and answers to common objections." },
      { title: "Moving testing in-house", body: "Whether in-house is right for you, the true cost of testing and a four-phase transition plan." },
      { title: "Improving an existing program", body: "Auditing your program, ten common failures and how to fix them, and measuring results." },
      { title: "Certification practice exam", body: "25 questions drawn from all nine chapters to check your team's readiness." },
    ],
    audience: [
      { title: "Owners and plant managers", body: "Cut hiring delays, downtime and the cost of sending people off site." },
      { title: "HR and program administrators", body: "Run drug tests and background checks through one compliant process." },
      { title: "Supervisors and collectors", body: "Test fast after an incident, with a documented result." },
    ],
    fileUrl: "https://drive.google.com/file/d/1HW4GQEiyKLdeY_eaE13RJgf3wQVlYJiK/view",
    industry: "manufacturing",
  },
];

export const getResource = (slug: string) => resources.find((r) => r.slug === slug);

// Partner library: member-gated (CPP members and clients). Not indexed.
export const library = [
  {
    group: "Clinic Owners Handbooks",
    items: [
      { title: "Drug Testing Handbook (211 pages)", url: "https://drive.google.com/file/d/1_flCkSbxa0xx6ZV2Li55e03CWoeLyFnP/view" },
      { title: "Background Checks Handbook (83 pages)", url: "https://drive.google.com/file/d/1Z_gi-pco6aP6iq6vc8FQRJB3z5bseUm6/view" },
    ],
  },
  {
    group: "Marketing sheets",
    items: [
      { title: "OraFlo data sheet (analytical)", url: "https://drive.google.com/file/d/1ZRNC5AJW4G9RWgsvR9GdEqTXYPV3vV2y/view" },
      { title: "eTest Swab data sheet (analytical)", url: "https://drive.google.com/file/d/1wjUV-qbu3MUp4j7nXeDAWaIO9hAAkvc1/view" },
    ],
  },
  {
    group: "Reference",
    items: [{ title: "Drug Guide: top 50+ requested drugs", url: "https://online.fliphtml5.com/jamrg/swet/" }],
  },
];
