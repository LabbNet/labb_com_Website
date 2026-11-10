// Every public URL on the Shopify store mapped to its new home, so search rankings and
// backlinks carry over. Permanent redirects (308) are treated by Google like 301s.
// Source: Shopify Admin export of pages, products, collections, blog articles and URL redirects (Nov 10, 2026).

type R = { source: string; destination: string; permanent: true };
const r = (source: string, destination: string): R => ({ source, destination, permanent: true });

const kitPages: [string, string][] = [
  ["kit-ua-06b", "ua-06b-svt"],
  ["kit-ua-13a", "ua-13a-svt"],
  ["kit-ua-15a", "ua-15a"],
  ["kit-ua-16c", "ua-16c-svt"],
  ["kit-ua-18c", "ua-18c-svt"],
  ["kit-ua-23a", "ua-23a-svt"],
  ["kit-orf-31c", "orf-31c-oraflo"],
  ["kit-or-14a", "or-14a-etest-swab"],
  ["oraflo-rapid-screens", "orf-31c-oraflo"],
];

export const redirects: R[] = [
  // Pages
  r("/pages/labb-station", "/labbhr"),
  r("/pages/labbhr", "/labbhr"),
  r("/pages/platforms", "/labbhr"),
  r("/pages/test-kits", "/test-kits"),
  ...kitPages.map(([from, to]) => r(`/pages/${from}`, `/test-kits/${to}`)),
  r("/pages/laboratory-testing", "/oral-fluid-drug-testing"),
  r("/pages/trial-offer", "/oral-fluid-drug-testing"),
  r("/pages/speed-swabs", "/urine-drug-testing"),
  r("/pages/trial-offer-1", "/get-a-quote"),
  r("/pages/quick-quote", "/get-a-quote"),
  r("/pages/questionnaire", "/get-a-quote"),
  r("/pages/contact-labb", "/contact"),
  r("/pages/contact-labb-1", "/contact"),
  r("/pages/thankyou", "/thank-you"),
  r("/pages/downloads", "/resources"),
  r("/pages/construction-handbook", "/resources/construction-screening-handbook"),
  r("/pages/manufacturing", "/resources/manufacturing-screening-handbook"),
  r("/pages/logistics-warehousing", "/industries/logistics-warehousing"),
  r("/pages/library", "/library"),
  r("/pages/affiliate-assets", "/library"),
  r("/pages/or-series", "/certifications"),
  r("/pages/certifications", "/certifications"),
  r("/pages/certification-exam-:slug", "/certifications"),
  r("/pages/network", "/channel-partner-program"),
  r("/pages/fasttrackfl", "/channel-partner-program"),
  r("/pages/labb-affiliate-terms", "/channel-partner-program"),
  r("/pages/labb-pass-qr-code-form", "/channel-partner-program"),
  r("/pages/sfec-welcome", "/"),
  r("/pages/treatment", "/"),
  r("/pages/data-sale-opt-out", "/privacy#your-choices"),
  r("/pages/:slug", "/"),

  // Old clinics page (Nov 2026) folded into the CPP page
  r("/for-clinics", "/channel-partner-program"),
  r("/cpp", "/channel-partner-program"),

  // Legacy Shopify short links
  r("/speedswabs", "/urine-drug-testing"),
  r("/guidebook", "/resources"),
  r("/network", "/channel-partner-program"),
  r("/fasttrackfl", "/channel-partner-program"),

  // Blog
  r("/blogs/news", "/news"),
  r("/blogs/news/tagged/:tag", "/news"),
  r("/blogs/news/:slug", "/news/:slug"),
  r("/blogs/:blog", "/news"),
  r("/blogs/:blog/:slug", "/news"),

  // Products and collections (store is closing; kits are quote-only)
  r("/products/labb-station-pro-drug-testing-system", "/labbhr"),
  r("/products/certification-:slug", "/certifications"),
  r("/products/labb-etest-cup-ua-23a-23-panel-forensic-urine-drug-screen-with-6-pad-specimen-validity", "/test-kits/ua-23a-svt"),
  r("/products/14a-rapid-oral-labb%C2%AE-etest-swabs-copy", "/test-kits/or-14a-etest-swab"),
  r("/products/:slug", "/test-kits"),
  r("/collections/ua-series-urine-cups", "/urine-drug-testing"),
  r("/collections/or-series", "/oral-fluid-drug-testing"),
  r("/collections/speed-swabs", "/oral-fluid-drug-testing"),
  r("/collections/labb-station-starter-kit", "/labbhr"),
  r("/collections/fastest-labs", "/channel-partner-program"),
  r("/collections/:slug*", "/test-kits"),
  r("/collections", "/test-kits"),

  // Policies
  r("/policies/privacy-policy", "/privacy"),
  r("/policies/terms-of-service", "/terms"),
  r("/policies/refund-policy", "/terms"),
  r("/policies/shipping-policy", "/terms"),
  r("/policies/contact-information", "/contact"),

  // Shopify system routes
  r("/cart", "/get-a-quote"),
  r("/cart/:path*", "/get-a-quote"),
  r("/account", "/library/login"),
  r("/account/:path*", "/library/login"),
  r("/search", "/"),
  r("/customer_authentication/:path*", "/library/login"),
];
