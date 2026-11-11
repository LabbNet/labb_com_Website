export const site = {
  name: "Labb",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://labb.com").replace(/\/$/, ""),
  legalName: "Ramsey Diagnostics Corporation d/b/a Labb",
  tagline: "Rapid drug testing, read by a reader, not a person.",
  description:
    "Labb helps employers run rapid drug testing in-house. Oral fluid and urine screens read by the Labb Station digital reader, with results in minutes and documented automatically.",
  email: "info@labb.com",
  phone: "(877) 868-9967",
  phoneHref: "tel:+18778689967",
  address: {
    street: "2115 Granby Street",
    city: "Norfolk",
    region: "VA",
    postal: "23517",
    country: "US",
  },
  clientLogin: "https://labbreport.com/screener/login",
  patent: "US PAT 10,340,032",
};

export const nav = [
  {
    label: "Who we serve",
    children: [
      { href: "/corrections", label: "Corrections and probation" },
      { href: "/drug-testing-businesses", label: "Drug testing businesses" },
      { href: "/industries/construction", label: "Employers: construction" },
      { href: "/industries/manufacturing", label: "Employers: manufacturing" },
      { href: "/industries/logistics-warehousing", label: "Employers: logistics and warehousing" },
    ],
  },
  {
    label: "Platforms",
    children: [
      { href: "/platforms", label: "All platforms" },
      { href: "/labb-station", label: "Labb Station: runs the test" },
      { href: "/labbhr", label: "LabbHR: runs the business" },
      { href: "/labbpo", label: "LabbPO: runs the caseload" },
      { href: "/one", label: "One by Labb" },
      { href: "/compare", label: "Compare Labb Station and LabbHR" },
    ],
  },
  { href: "/test-kits", label: "Test kits" },
  {
    label: "Training",
    children: [
      { href: "/training", label: "Training and education" },
      { href: "/certifications", label: "Certifications" },
      { href: "/news", label: "News and insights" },
      { href: "/members", label: "CPP member login" },
    ],
  },
  { href: "/channel-partner-program", label: "Partner program" },
] as const;

export function absoluteUrl(path = "/") {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
