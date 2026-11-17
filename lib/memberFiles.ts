// Member-only files stored in private/member-files and served by /api/members/files/[slug].
export const memberFiles = [
  { slug: "regional-drug-use", file: "labb-regional-drug-use-testing-panels-2026.pdf", title: "Regional Drug Use and Recommended Testing Panels (2026)" },
  { slug: "cost-guidebook", file: "labbhr-drug-testing-cost-guidebook-q4-2026-v1.30.pdf", title: "Drug Testing Cost Guidebook" },
];
export const memberFile = (slug: string) => memberFiles.find((f) => f.slug === slug);
