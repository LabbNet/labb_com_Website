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
  fileUrl?: string; // external file (never rendered on the public page)
  file?: string; // member file slug, served after the lead form by /api/download/[slug]
  industry?: string;
  formIndustry?: string; // preset for the lead form industry question
};

export const resources: Resource[] = [
  {
    slug: "construction-screening-guidebook",
    title: "LabbHR Construction Screening Guidebook",
    shortTitle: "Construction Screening Guidebook",
    metaDescription:
      "Free guidebook for construction companies: bring drug and background screening in-house. 9 chapters on law, policy, collection, background checks and moving testing in-house.",
    eyebrow: "Free guidebook for construction companies",
    h1: "Bring drug and background screening in-house, and do it right.",
    lede: "A practical training guide for owners, safety managers and HR teams who want faster results and fewer jobsite delays, without cutting corners on compliance.",
    cover: "/img/construction-guidebook.webp",
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
    slug: "manufacturing-screening-guidebook",
    title: "LabbHR Manufacturing Screening Guidebook",
    shortTitle: "Manufacturing Screening Guidebook",
    metaDescription:
      "Free guidebook for manufacturers: run drug and background screening in-house. 9 chapters, 79 pages, with a certification practice exam.",
    eyebrow: "Free guidebook for manufacturers",
    h1: "Bring drug and background screening in-house, and do it right.",
    lede: "A practical training guide for owners, HR teams, program administrators, collectors and supervisors who want faster results and less downtime, without cutting corners on compliance.",
    cover: "/img/manufacturing-guidebook.webp",
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
    fileUrl: "https://drive.google.com/file/d/18yys9SpC10rh6LDHYiiCKfbbR4wl24l6/view",
    industry: "manufacturing",
  },
  {
    slug: "logistics-screening-guidebook",
    title: "LabbHR Logistics Screening Guidebook",
    shortTitle: "Logistics Screening Guidebook",
    metaDescription:
      "Free guidebook for warehouses, distribution centers and delivery fleets: run drug and background screening in-house. 9 chapters, 79 pages, with chapter reviews.",
    eyebrow: "Free guidebook for logistics and warehousing",
    h1: "Keep the dock moving with in-house screening done right.",
    lede: "A practical training guide for warehouse, distribution and delivery operations that want faster hiring, fast post-incident testing and a program that holds up.",
    cover: "/img/logistics-guidebook.webp",
    coverW: 900,
    coverH: 1165,
    facts: ["9 chapters, 79 pages", "Drug testing and background checks together", "Chapter reviews to check understanding", "A four-phase plan to move testing in-house"],
    chapters: [
      { title: "Why screening matters in logistics", body: "The safety and business risk in warehouses, distribution centers and delivery, and what a program protects." },
      { title: "Laws and rules that shape your program", body: "DOT and company testing, state marijuana and prescription laws, and the rules for background checks." },
      { title: "Building your written policy", body: "What the policy must cover, testing reasons, choosing a panel and specimen, and consistent consequences." },
      { title: "Drug testing best practices", body: "Roles, collection areas across shifts and sites, collection steps, non-negative results and confidentiality." },
      { title: "Background screening best practices", body: "The process step by step and matching searches to logistics roles." },
      { title: "Reading the result", body: "Why an objective digital reader beats reading by eye, and answers to common objections." },
      { title: "Transitioning to in-house testing", body: "A four-phase plan to move from an outside clinic to testing on site." },
      { title: "Improving an existing program", body: "Auditing what you run today and fixing the most common failures." },
      { title: "Your partners: Labb and the CPP", body: "How Labb and its partner clinics help you set up and keep the program running." },
    ],
    audience: [
      { title: "Operations and site managers", body: "Hire faster and get people back to work without a clinic trip." },
      { title: "Safety managers", body: "Test fast after an incident, with a documented result." },
      { title: "HR teams", body: "One compliant process for drug tests and background checks across every site." },
    ],
    file: "employer-logistics",
    industry: "logistics-warehousing",
    formIndustry: "Logistics and warehousing",
  },
  {
    slug: "employers-guidebook",
    title: "LabbHR Employers Guidebook",
    shortTitle: "Employers Guidebook",
    metaDescription:
      "Free employer's guidebook to workplace drug and alcohol testing: the law, the drugs, specimens, collection, results, policy and running the program. 16 chapters, 94 pages.",
    eyebrow: "Free guidebook for employers in any industry",
    h1: "Everything an employer needs to run workplace drug and alcohol testing.",
    lede: "A plain-language guide for HR managers, owners and program administrators who are starting a testing program or tightening up the one they have.",
    cover: "/img/employers-guidebook.webp",
    coverW: 900,
    coverH: 1165,
    facts: ["16 chapters, 94 pages", "Written for any industry", "Setup checklist and timeline", "Real-world case scenarios"],
    chapters: [
      { title: "Why employers test", body: "Safety, cost, liability and what a program actually protects." },
      { title: "The legal landscape", body: "Federal and state rules, marijuana, prescriptions and where DOT applies." },
      { title: "The drugs", body: "What employers test for and why panels differ." },
      { title: "Specimens", body: "Urine, oral fluid and hair, and when each one fits." },
      { title: "How testing works", body: "Screening, laboratory confirmation and medical review, and the credentials to look for." },
      { title: "Collection and chain of custody", body: "How collections are done and documented so results hold up." },
      { title: "Testing on site with rapid tests", body: "Running rapid tests yourself and talking about results." },
      { title: "Types of testing", body: "Pre-employment, random, reasonable suspicion, post-accident and return to duty." },
      { title: "Recognizing signs of drug and alcohol use", body: "What supervisors should look for and document." },
      { title: "Handling results", body: "Negatives, non-negatives, refusals and what happens next." },
      { title: "Writing your policy", body: "What a written policy must cover." },
      { title: "Running the program", body: "Records, vendors, random selection and day-to-day administration." },
      { title: "Communicating the program", body: "Rolling the program out to employees and supervisors." },
      { title: "Setup checklist and timeline", body: "A week-by-week plan from decision to first test." },
      { title: "DOT testing requirements", body: "What changes when employees fall under DOT rules." },
      { title: "Case scenarios", body: "Common situations and how to handle them." },
    ],
    audience: [
      { title: "HR managers", body: "Set up a compliant program and handle results with confidence." },
      { title: "Owners and executives", body: "Understand the cost, risk and value of testing." },
      { title: "Program administrators", body: "Run the day-to-day program with a checklist." },
    ],
    file: "employer-guidebook",
  },
  {
    slug: "healthcare-screening-guidebook",
    title: "LabbHR Employer Guidebook: Healthcare Edition",
    shortTitle: "Healthcare Edition",
    metaDescription:
      "Free drug and alcohol testing guidebook for healthcare employers, with chapters on drug diversion, licensed professionals and medical staff. 19 chapters, 108 pages.",
    eyebrow: "Free guidebook for healthcare employers",
    h1: "Workplace drug testing built for healthcare.",
    lede: "For hospitals, clinics, long-term care and home health employers who need a testing program that addresses drug diversion and licensed staff.",
    cover: "/img/healthcare-guidebook.webp",
    coverW: 900,
    coverH: 1165,
    facts: ["19 chapters, 108 pages", "Drug diversion and licensed professionals", "Setup checklist and timeline", "Real-world case scenarios"],
    chapters: [
      { title: "The fundamentals", body: "Why employers test, the legal landscape, the drugs, specimens and how testing works." },
      { title: "Collection and on-site testing", body: "Chain of custody, rapid tests on site and the types of testing." },
      { title: "Signs of use and handling results", body: "What supervisors look for and what happens after a non-negative." },
      { title: "Drug diversion and testing", body: "How testing fits a diversion prevention program." },
      { title: "Licensed professionals and the medical staff", body: "Nurses, physicians, pharmacists and the rules around them." },
      { title: "Running a program in a healthcare setting", body: "Shifts, units and the realities of a care environment." },
      { title: "Policy, administration and rollout", body: "Writing the policy, running the program and communicating it to staff." },
      { title: "Setup, DOT and case scenarios", body: "A setup timeline, where DOT applies and situations you will face." },
    ],
    audience: [
      { title: "HR and talent teams", body: "Screen clinical and non-clinical staff consistently." },
      { title: "Nursing and department leaders", body: "Recognize signs of use and act on them correctly." },
      { title: "Compliance and pharmacy", body: "Connect testing to drug diversion prevention." },
    ],
    file: "employer-healthcare",
    formIndustry: "Healthcare",
  },
  {
    slug: "hospitality-screening-guidebook",
    title: "LabbHR Employer Guidebook: Hospitality Edition",
    shortTitle: "Hospitality Edition",
    metaDescription:
      "Free drug and alcohol testing guidebook for hotels, restaurants and event venues, with chapters on alcohol on the job, high-turnover hiring and special roles. 19 chapters, 108 pages.",
    eyebrow: "Free guidebook for hospitality employers",
    h1: "Workplace drug and alcohol testing built for hospitality.",
    lede: "For hotels, restaurants, resorts and event venues that hire fast, serve alcohol and need a program that fits a hospitality workforce.",
    cover: "/img/hospitality-guidebook.webp",
    coverW: 900,
    coverH: 1165,
    facts: ["19 chapters, 108 pages", "Alcohol on the job: service, tasting and events", "Drivers, security and special roles", "Setup checklist and case scenarios"],
    chapters: [
      { title: "The fundamentals", body: "Why employers test, the legal landscape, the drugs, specimens and how testing works." },
      { title: "Collection and on-site testing", body: "Chain of custody, rapid tests on site and the types of testing." },
      { title: "Signs of use and handling results", body: "What managers look for and what happens after a non-negative." },
      { title: "Designing a program for a hospitality workforce", body: "High turnover, seasonal staff and multiple shifts." },
      { title: "Alcohol on the job", body: "Service, tasting and events, and where the lines are." },
      { title: "Drivers, security and other special roles", body: "Roles that need a closer look." },
      { title: "Policy, administration and rollout", body: "Writing the policy, running the program and communicating it to staff." },
      { title: "Setup, DOT and case scenarios", body: "A setup timeline, where DOT applies and situations you will face." },
    ],
    audience: [
      { title: "General managers and owners", body: "Hire quickly without adding risk." },
      { title: "HR teams", body: "One consistent process across properties and venues." },
      { title: "Food, beverage and event leaders", body: "Handle alcohol on the job with clear rules." },
    ],
    file: "employer-hospitality",
  },
  {
    slug: "clinic-owners-guidebook",
    title: "LabbHR Clinic Owners Guidebook",
    shortTitle: "Clinic Owners Guidebook",
    metaDescription:
      "Free drug and alcohol testing guidebook for clinic owners, operators and collectors: rapid test technology, collections, lab testing, MRO, alcohol, results and quality control. 11 chapters, 217 pages.",
    eyebrow: "Free guidebook for clinics and collection sites",
    h1: "The complete drug and alcohol testing manual for clinic owners.",
    lede: "For clinic owners, operators and collectors who want to run rapid testing and collections at a professional standard, and grow employer accounts.",
    cover: "/img/clinic-owners-guidebook.webp",
    coverW: 1400,
    coverH: 1263,
    facts: ["11 chapters, 217 pages", "Rapid tests, labs, MRO and alcohol", "Chapter reviews to train your staff", "Quality control and compliance"],
    chapters: [
      { title: "Understanding rapid test kit technology", body: "How lateral flow tests work and what affects accuracy." },
      { title: "Drug classes and emerging substances", body: "What each class does and what is showing up now." },
      { title: "Rapid test kit types and specimens", body: "Cups, dips, cassettes and oral fluid, and when each fits." },
      { title: "Specimen collections and procedures", body: "Step-by-step collections and custody and control forms." },
      { title: "Understanding laboratory testing", body: "Screening and confirmation at the lab." },
      { title: "Reading package inserts and resolving questions", body: "Cutoffs, cross-reactivity and class assays." },
      { title: "Understanding the MRO process", body: "Where the MRO fits and how validity results are handled." },
      { title: "Alcohol testing and biomarkers", body: "Breath, saliva and EtG, and what each shows." },
      { title: "Communicating results", body: "Talking to donors and employers about results." },
      { title: "Privacy and confidentiality", body: "What is confidential and who can see it." },
      { title: "Quality control and compliance", body: "External quality control and written procedures." },
    ],
    audience: [
      { title: "Clinic owners", body: "Run a testing service that employers trust." },
      { title: "Operators and managers", body: "Standardize procedures across staff and sites." },
      { title: "Collectors", body: "Train on collections, reading and results." },
    ],
    file: "clinic-owners-guidebook",
  },
  {
    slug: "background-screening-guidebook",
    title: "LabbHR Background Screening Guidebook",
    shortTitle: "Background Screening Guidebook",
    metaDescription:
      "Free background screening guidebook for clinic owners, operators and sales staff: the FCRA, workplace searches, criminal records, fair chance hiring and state laws. 9 chapters, 83 pages.",
    eyebrow: "Free guidebook for clinics and screening providers",
    h1: "Understand the process and the law before you offer a single background check.",
    lede: "For clinic owners, operators and sales staff adding background screening to their services, with every major search and legal requirement explained.",
    cover: "/img/background-screening-guidebook.webp",
    coverW: 900,
    coverH: 1165,
    facts: ["9 chapters, 83 pages", "FCRA and state and local laws", "Every major workplace search", "Chapter reviews and customer questions"],
    chapters: [
      { title: "The background screening industry", body: "What a background check is and is not, the parties involved and how clinics take part." },
      { title: "The Fair Credit Reporting Act", body: "The duties of employers and screening providers under federal law." },
      { title: "Workplace screening searches", body: "Criminal, identity, employment, education and more." },
      { title: "The screening process step by step", body: "From disclosure and authorization to adverse action." },
      { title: "Criminal records and fair chance hiring", body: "How records are found, reported and considered." },
      { title: "Other workplace searches and special rules", body: "Credit reports, AI hiring tools and more." },
      { title: "State and local laws", body: "Ban the box and other rules that change by location." },
      { title: "Other screening sectors at a glance", body: "Tenant and other screening outside employment." },
      { title: "Running a compliant screening business", body: "Policies, customer questions and staying compliant." },
    ],
    audience: [
      { title: "Clinic owners", body: "Add background screening the right way." },
      { title: "Operators", body: "Run a compliant process every time." },
      { title: "Sales staff", body: "Answer employer questions with confidence." },
    ],
    file: "background-screening",
  },
  {
    slug: "drug-testing-cost-guidebook",
    title: "LabbHR Drug Testing Cost Guidebook",
    shortTitle: "Drug Testing Cost Guidebook",
    metaDescription:
      "Free guidebook on what drug testing really costs: positive rates by specimen, confirmation and medical review, in-house rapid testing versus straight-to-lab pricing, and budgeting. 7 chapters, 57 pages.",
    eyebrow: "Free guidebook on drug testing costs",
    h1: "What drug testing really costs, and how to control it.",
    lede: "For employers, clinics and program managers who budget for drug testing and want to compare in-house rapid testing with straight-to-laboratory testing.",
    cover: "/img/cost-guidebook.webp",
    coverW: 900,
    coverH: 1165,
    facts: ["7 chapters, 57 pages", "Positive rates by specimen", "In-house versus lab pricing", "Budgeting tools"],
    chapters: [
      { title: "What drug testing really costs", body: "Every cost in a program, and why the positive rate moves the budget." },
      { title: "Positive rates by specimen", body: "How urine, oral fluid and hair compare." },
      { title: "Confirmation and medical review", body: "The cost of a non-negative result." },
      { title: "Pricing in-house rapid testing", body: "What a rapid test program costs per donor." },
      { title: "Pricing straight-to-laboratory testing", body: "What sending every specimen to the lab costs." },
      { title: "Comparing the two models", body: "When each wins, and choosing a model or a mix." },
      { title: "Budgeting and controlling cost", body: "Tools to plan and manage the testing budget." },
    ],
    audience: [
      { title: "Employers and HR", body: "Budget for testing with real numbers." },
      { title: "Finance teams", body: "Compare models on total cost, not price per test." },
      { title: "Clinics", body: "Price programs and explain the value to clients." },
    ],
    file: "cost-guidebook",
  },

];

export const getResource = (slug: string) => resources.find((r) => r.slug === slug);

// Partner library: member-gated (CPP members and clients). Not indexed.
export const library = [
  {
    group: "Clinic Owners Guidebooks",
    items: [
      { title: "Drug Testing Guidebook", url: "/api/members/files/clinic-owners-guidebook" },
      { title: "Background Screening Guidebook", url: "/api/members/files/background-screening" },
      { title: "Drug Testing Cost Guidebook", url: "/api/members/files/cost-guidebook" },
    ],
  },
  {
    group: "Employer Guidebooks",
    items: [
      { title: "Employers Guidebook (all industries)", url: "/api/members/files/employer-guidebook" },
      { title: "Construction", url: "/api/members/files/employer-construction" },
      { title: "Manufacturing", url: "/api/members/files/employer-manufacturing" },
      { title: "Logistics and warehousing", url: "/api/members/files/employer-logistics" },
      { title: "Healthcare", url: "/api/members/files/employer-healthcare" },
      { title: "Hospitality", url: "/api/members/files/employer-hospitality" },
    ],
  },
  {
    group: "Marketing sheets",
    items: [
      { title: "OraFlo Rapid Drug Testing Booklet (2026)", url: "/api/members/files/oraflo-booklet" },
      { title: "eTest Cup Booklet (2026)", url: "/api/members/files/etest-cup-booklet" },
      { title: "eTest Swab Booklet (2026)", url: "/api/members/files/etest-swab-booklet" },
      { title: "LabbHR Proctor Testing Kiosk Brochure (coming 2027)", url: "/api/members/files/kiosk-brochure" },
    ],
  },
  {
    group: "Reference",
    items: [
      { title: "Drug Guide: top 50+ requested drugs", url: "https://online.fliphtml5.com/jamrg/swet/" },
      { title: "Regional Drug Use and Recommended Testing Panels (2026)", url: "/api/members/files/regional-drug-use" },
    ],
  },
];
