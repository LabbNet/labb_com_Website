import { publishedKits } from "@/lib/kits";
// CPP member price list categories and helpers.
export const PRICE_CATEGORIES = [
  { value: "rapid-kits", label: "Rapid test kits" },
  { value: "readers", label: "Tablet readers" },
  { value: "stands", label: "Accessories" },
  { value: "saas", label: "SaaS by platform" },
  { value: "lab-mro", label: "Lab and MRO services" },
] as const;
export type PriceCategory = (typeof PRICE_CATEGORIES)[number]["value"];
export const isPriceCategory = (v: unknown): v is PriceCategory => PRICE_CATEGORIES.some((c) => c.value === v);

export type PriceItem = {
  id: string; category: PriceCategory; name: string; sku: string | null; description: string | null; unit: string | null;
  sl1_cents: number | null; sl1_msrp_cents: number | null; sl3_cents: number | null; sl3_msrp_cents: number | null; online_cents: number | null; product_path: string | null; notes: string | null; sort: number; active: boolean; updated_at: Date;
};

export const money = (c: number | null) =>
  c == null ? "" : (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

// "$12.50", "12.5" or "" -> cents or null. Returns undefined when the text is not a price.
export function parseCents(s: string): number | null | undefined {
  const t = s.replace(/[$,\s]/g, "");
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return undefined;
  return Math.round(Number(t) * 100);
}

export const PRICE_FIELDS = [
  { key: "sl1_cents", form: "sl1", label: "Service Level 1 price" },
  { key: "sl1_msrp_cents", form: "sl1_msrp", label: "Service Level 1 MSRP" },
  { key: "sl3_cents", form: "sl3", label: "Service Level 3 price" },
  { key: "sl3_msrp_cents", form: "sl3_msrp", label: "Service Level 3 MSRP" },
  { key: "online_cents", form: "online", label: "Online sale price" },
] as const;

// Share of the online sale price paid to the CPP member who runs a walk-in test sold online in their territory.
export const WALK_IN_SHARE = 0.8;

// Product details pages an item can link to.
export const PRODUCT_PAGES: { group: string; options: { path: string; label: string }[] }[] = [
  { group: "Test kits", options: publishedKits.map((k) => ({ path: `/test-kits/${k.slug}`, label: k.name })) },
  { group: "Kit families", options: [
    { path: "/test-kits/urine-etest", label: "Urine eTest" },
    { path: "/test-kits/oral-etest", label: "Oral eTest" },
    { path: "/test-kits/oraflo", label: "OraFlo" },
  ] },
  { group: "Readers and software", options: [
    { path: "/labb-station", label: "Labb Station" },
    { path: "/labbhr", label: "LabbHR" },
    { path: "/labbpo", label: "LabbPO" },
    { path: "/labbmd", label: "LabbMD" },
    { path: "/one", label: "One by Labb" },
  ] },
];
const ALL_PATHS = new Set(PRODUCT_PAGES.flatMap((g) => g.options.map((o) => o.path)));
export const isProductPath = (v: string) => ALL_PATHS.has(v);
// Kit behind a price item's product page, if it is a kit page.
export function productKit(path: string | null) {
  const m = path?.match(/^\/test-kits\/([a-z0-9-]+)$/);
  return m ? publishedKits.find((k) => k.slug === m[1]) ?? null : null;
}
const PAGE_IMAGES: Record<string, string> = {
  "/test-kits/urine-etest": "/kits/ua-13a/ua-13a-etest-cup-urine-drug-test-main-v2.webp",
  "/test-kits/oral-etest": "/kits/or-14a-etest-swab-oral-fluid-drug-test.webp",
  "/test-kits/oraflo": "/kits/orf-31c/oraflo-orf-31c-oral-fluid-drug-test.webp",
  "/labb-station": "/graphics/home/outcome-fewer-errors.webp",
  "/labbhr": "/img/labbhr-drug-testing-software-dashboard.webp",
};
// Picture for a price item: the kit's product shot, or the product page's image.
export function productImage(path: string | null): string | null {
  if (!path) return null;
  return productKit(path)?.image ?? PAGE_IMAGES[path] ?? null;
}
// Saved link, or the kit whose code matches the SKU or the product name.
// Codes compare on letters and digits only, so "UA:23A", "UA-23A-SVT", "ua23a" and "UA:23" all find UA:23A.
const norm = (v: string | null | undefined) => (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
function kitFor(text: string | null | undefined) {
  const t = norm(text);
  if (t.length < 3) return null;
  const exact = publishedKits.find((k) => t.includes(norm(k.code)));
  if (exact) return exact;
  // A short code like "UA:18" or "OR:06" finds the one kit it starts.
  const starts = publishedKits.filter((k) => norm(k.code).startsWith(t) || (/^[A-Z]+\d+$/.test(t) && norm(k.code).startsWith(t)));
  if (starts.length === 1) return starts[0];
  const tokens = (text || "").toUpperCase().match(/[A-Z]{2,3}[:\s-]?\d{2}[A-Z]?/g) || [];
  for (const tok of tokens) {
    const n = norm(tok);
    const hit = publishedKits.filter((k) => norm(k.code) === n || norm(k.code).startsWith(n));
    if (hit.length === 1) return hit[0];
  }
  return null;
}
export function productLink(i: Pick<PriceItem, "product_path" | "sku"> & { name?: string | null }): string | null {
  if (i.product_path && isProductPath(i.product_path)) return i.product_path;
  const k = kitFor(i.sku) ?? kitFor(i.name);
  return k ? `/test-kits/${k.slug}` : null;
}
