// Member-only files stored in private/member-files and served by /api/members/files/[slug].
export const memberFiles = [
  { slug: "clinic-owners-handbook", file: "labbhr-clinic-owners-handbook-q4-2026-v1.60.pdf", title: "Clinic Owners Handbook (Drug Testing)" },
  { slug: "background-screening", file: "labbhr-background-screening-guidebook-q4-2026-v1.1.pdf", title: "Background Screening Guidebook" },
  { slug: "cost-guidebook", file: "labbhr-drug-testing-cost-guidebook-q4-2026-v1.30.pdf", title: "Drug Testing Cost Guidebook" },
  { slug: "employer-guidebook", file: "labbhr-employer-guidebook-v1.2.1.pdf", title: "Employer's Guidebook" },
  { slug: "employer-healthcare", file: "labbhr-employer-guidebook-healthcare-v1.2.1.pdf", title: "Healthcare" },
  { slug: "employer-hospitality", file: "labbhr-employer-guidebook-hospitality-v1.2.1.pdf", title: "Hospitality" },
  { slug: "employer-construction", file: "labbhr-construction-screening-handbook-q4-2026-v1.70.pdf", title: "Construction" },
  { slug: "employer-manufacturing", file: "labbhr-manufacturing-screening-handbook-q4-2026-v1.71.pdf", title: "Manufacturing" },
  { slug: "employer-logistics", file: "labbhr-logistics-screening-handbook-q4-2026-v1.70.pdf", title: "Logistics" },
  { slug: "oraflo-booklet", file: "oraflo-booklet-2026-labbhr-v2.00.pdf", title: "OraFlo Rapid Drug Testing Booklet" },
  { slug: "regional-drug-use", file: "labb-regional-drug-use-testing-panels-2026.pdf", title: "Regional Drug Use and Recommended Testing Panels (2026)" },
];
export const memberFile = (slug: string) => memberFiles.find((f) => f.slug === slug);
