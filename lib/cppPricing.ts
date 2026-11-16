// CPP member price list categories and helpers.
export const PRICE_CATEGORIES = [
  { value: "rapid-kits", label: "Rapid test kits" },
  { value: "readers", label: "Tablet readers" },
  { value: "stands", label: "Testing stands" },
  { value: "saas", label: "SaaS by platform" },
  { value: "lab-mro", label: "Lab and MRO services" },
] as const;
export type PriceCategory = (typeof PRICE_CATEGORIES)[number]["value"];
export const isPriceCategory = (v: unknown): v is PriceCategory => PRICE_CATEGORIES.some((c) => c.value === v);

export type PriceItem = {
  id: string; category: PriceCategory; name: string; sku: string | null; description: string | null; unit: string | null;
  member_cents: number | null; employer_cents: number | null; notes: string | null; sort: number; active: boolean; updated_at: Date;
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
