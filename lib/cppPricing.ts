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
// Saved link, or a kit page whose code matches the SKU.
export function productLink(i: Pick<PriceItem, "product_path" | "sku">): string | null {
  if (i.product_path && isProductPath(i.product_path)) return i.product_path;
  const code = (i.sku || "").replace(/[\s-]/g, "").toUpperCase();
  const k = code && publishedKits.find((k) => k.code.replace(/[\s-]/g, "").toUpperCase() === code);
  return k ? `/test-kits/${k.slug}` : null;
}
