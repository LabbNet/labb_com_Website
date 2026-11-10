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
    label: "Software",
    children: [
      { href: "/software", label: "Compare Labb Station and LabbHR" },
      { href: "/labb-station", label: "Labb Station reader" },
      { href: "/labbhr", label: "LabbHR platform" },
    ],
  },
  { href: "/test-kits", label: "Test kits" },
  {
    label: "Training",
    children: [
      { href: "/training", label: "Training and education" },
      { href: "/certifications", label: "Certifications" },
      { href: "/news", label: "News and insights" },
      { href: "/library", label: "Partner library" },
    ],
  },
  {
    label: "Industries",
    children: [
      { href: "/industries/construction", label: "Construction" },
      { href: "/industries/manufacturing", label: "Manufacturing" },
      { href: "/industries/logistics-warehousing", label: "Logistics and warehousing" },
    ],
  },
  { href: "/channel-partner-program", label: "Partner program" },
] as const;

export function absoluteUrl(path = "/") {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
