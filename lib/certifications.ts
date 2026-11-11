// Labb certifications are separate by type (Nov 2026):
//   product   - how a specific product works (product specific)
//   specimen  - collecting a specimen type for the 2027 readers (e.g. hair)
//   software  - how to use a specific Labb software (software specific)
//   position  - general knowledge for a role or industry (e.g. clinic owner)
// Every certification is paid. Online exam: 90% to pass, valid one year.

export type CertType = "product" | "specimen" | "software" | "position";

export type Cert = {
  sku: string;
  type: CertType;
  name: string;
  covers: string;
  forWho: string;
  priceEnv: string; // Stripe Price ID env var, used when checkout launches
  lmsCourse: string;
  status?: string; // e.g. "Coming 2027"
};

export const certTypes: Record<CertType, { title: string; label: string; summary: string }> = {
  product: {
    title: "Product certifications",
    label: "Product",
    summary: "How a specific Labb product works: collection, reading the device, validity checks and what a result means. One certification per product series.",
  },
  specimen: {
    title: "Specimen collection certifications",
    label: "Specimen",
    summary: "How to collect a specimen type correctly for the new LabbHR readers, starting with hair. One certification per specimen.",
  },
  software: {
    title: "Software certifications",
    label: "Software",
    summary: "How to use a specific Labb software from collection to final result. One certification per software.",
  },
  position: {
    title: "Position and industry certifications",
    label: "Position",
    summary: "Drug testing knowledge for a role or industry, not tied to one product or software. Built on the matching Labb handbook.",
  },
};

export const certs: Cert[] = [
  // Product
  { sku: "cert-product-ua", type: "product", name: "UA Series urine cups", covers: "eTest Cup collection, temperature and validity checks, reading each side, and lab confirmation.", forWho: "Collectors", priceEnv: "STRIPE_PRICE_CERT_PRODUCT_UA", lmsCourse: "product-ua" },
  { sku: "cert-product-or", type: "product", name: "OR Series oral fluid (eTest Swab)", covers: "Observed oral fluid collection, saturation, alcohol pad and reading the device.", forWho: "Collectors", priceEnv: "STRIPE_PRICE_CERT_PRODUCT_OR", lmsCourse: "product-or" },
  { sku: "cert-product-orf", type: "product", name: "ORF Series oral fluid (OraFlo)", covers: "OraFlo collection, masked drug codes, read times and lab confirmation.", forWho: "Collectors", priceEnv: "STRIPE_PRICE_CERT_PRODUCT_ORF", lmsCourse: "product-orf" },
  // Specimen collection (for the 2027 LabbHR readers)
  { sku: "cert-specimen-hair", type: "specimen", name: "Hair collection", covers: "Collecting, labeling and handling hair specimens for the LabbHR Reader and Pro Reader.", forWho: "Collectors", priceEnv: "STRIPE_PRICE_CERT_SPECIMEN_HAIR", lmsCourse: "specimen-hair", status: "Coming 2027" },
  // Software
  { sku: "cert-software-station", type: "software", name: "Labb Station", covers: "Setting up a test, guided collection, capturing and reading the device, and sending non-negatives to the lab.", forWho: "Collectors", priceEnv: "STRIPE_PRICE_CERT_SOFTWARE_STATION", lmsCourse: "software-labb-station" },
  { sku: "cert-software-labbhr", type: "software", name: "LabbHR", covers: "Sales, marketing, contracting and accounting tools, plus every Labb Station workflow and background checks.", forWho: "Drug testing business owners, staff and collectors", priceEnv: "STRIPE_PRICE_CERT_SOFTWARE_LABBHR", lmsCourse: "software-labbhr" },
  { sku: "cert-software-labbpo", type: "software", name: "LabbPO", covers: "Caseloads, random selection and notification, the offender portal, fee collection and the guaranteed result system.", forWho: "Probation and parole officers and corrections administrators", priceEnv: "STRIPE_PRICE_CERT_SOFTWARE_LABBPO", lmsCourse: "software-labbpo" },
  // Position / industry
  { sku: "cert-clinic-owners", type: "position", name: "Clinic Owner", covers: "Drug testing in general: rapid and lab testing, the MRO process, collections, package inserts, quality control and privacy.", forWho: "Clinic owners and operators", priceEnv: "STRIPE_PRICE_CERT_CLINIC_OWNERS", lmsCourse: "clinic-owners" },
  { sku: "cert-background", type: "position", name: "Background Screening", covers: "How background checks work and what the law requires before you offer or order them.", forWho: "Clinic owners and HR teams", priceEnv: "STRIPE_PRICE_CERT_BACKGROUND", lmsCourse: "background-screening" },
  { sku: "cert-drug-testing-cost", type: "position", name: "Drug Testing Cost", covers: "How positive rates by specimen drive lab confirmation and MRO costs, and how to price a program.", forWho: "Owners and finance teams", priceEnv: "STRIPE_PRICE_CERT_COST", lmsCourse: "drug-testing-cost" },
  { sku: "cert-construction", type: "position", name: "Construction Screening", covers: "Drug and background screening for construction companies, from policy to moving testing in-house.", forWho: "Construction owners, safety managers and HR", priceEnv: "STRIPE_PRICE_CERT_CONSTRUCTION", lmsCourse: "construction" },
  { sku: "cert-manufacturing", type: "position", name: "Manufacturing Screening", covers: "Drug and background screening for manufacturers, including staffing agency workers and post-incident testing.", forWho: "Plant managers, HR and program administrators", priceEnv: "STRIPE_PRICE_CERT_MANUFACTURING", lmsCourse: "manufacturing" },
  { sku: "cert-logistics", type: "position", name: "Logistics Screening", covers: "Drug and background screening for warehouses and distribution centers across shifts and sites.", forWho: "Logistics HR and site managers", priceEnv: "STRIPE_PRICE_CERT_LOGISTICS", lmsCourse: "logistics" },
];

// Who takes what. Position certifications are separate from product and software certifications.
export const paths: { role: string; position: string; product: string; software: string }[] = [
  { role: "Clinic owner", position: "Clinic Owner (plus Background Screening if you offer checks)", product: "Not required", software: "Not required" },
  { role: "Collector at a clinic", position: "Not required", product: "Each product series you collect, plus specimen collection (such as hair) when offered", software: "Labb Station or LabbHR, whichever your clinic uses" },
  { role: "Employer HR or safety manager", position: "Your industry: Construction, Manufacturing or Logistics", product: "Not required", software: "Labb Station, if your team tests in-house" },
  { role: "Probation or parole officer", position: "Not required", product: "Each product series used on site", software: "LabbPO, plus Labb Station for on-site rapid tests" },
  { role: "Employer staff who collect in-house", position: "Not required", product: "Each product series you collect", software: "Labb Station or LabbHR, whichever you use" },
];
