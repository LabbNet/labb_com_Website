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
    base: ["/industries"],
    children: [
      { href: "/laboratories", label: "Laboratories" },
      { href: "/tpas", label: "TPAs" },
      { href: "/collection-sites", label: "Collection Sites" },
      { href: "/employers", label: "Employers" },
      { href: "/treatment-recovery", label: "Treatment & Recovery" },
      { href: "/corrections", label: "Corrections" },
    ],
  },
  {
    label: "Platforms",
    base: ["/platforms", "/compare"],
    children: [
      { href: "/one", label: "One by Labb" },
      { href: "/labbhr", label: "LabbHR" },
      { href: "/labbpo", label: "LabbPO" },
      { href: "/labbmd", label: "LabbMD" },
      { href: "/labb-station", label: "Labb Station" },
    ],
  },
  {
    label: "Test kits",
    base: ["/test-kits"],
    children: [
      { href: "/test-kits/oral-etest", label: "Oral eTest" },
      { href: "/test-kits/urine-etest", label: "Urine eTest" },
      { href: "/test-kits/oraflo", label: "OraFlo" },
    ],
  },
  {
    label: "Training",
    base: ["/resources", "/news"],
    children: [
      { href: "/training", label: "Training and education" },
      { href: "/certifications", label: "Certifications" },
      { href: "/news", label: "News and insights" },
    ],
  },
  {
    label: "Partner program",
    base: ["/channel-partner-program", "/members"],
    children: [
      { href: "/channel-partner-program", label: "Overview" },
      { href: "/channel-partner-program/program-details", label: "Program Details" },
      { href: "/channel-partner-program/get-started", label: "Get Started" },
      { href: "/login?next=/members", label: "Login" },
    ],
  },
] as const;

export function absoluteUrl(path = "/") {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
