// Quick Test panels and pricing. Shared by the checkout form (live price) and the server (the price
// actually charged), so the browser can never set its own total.
import { publishedKits, type Kit } from "@/lib/kits";

// Quick Test pricing. Admins edit it in /admin/settings (stored in site_settings as
// "quick_test_pricing"); these are the defaults until it is saved. Amounts are in cents.
// Total = kit price + shipping (overnight, second day or ground) + proctoring.
// Kit price: the online sale price set for that kit in Admin > CPP pricing (kitCents, by kit slug).
// A kit with no online sale price yet falls back to FALLBACK_KIT_CENTS.
export type QtPricing = {
  kitCents: Record<string, number>;
  shippingCents: number; // overnight
  shipping2DayCents: number;
  shippingGroundCents: number;
  proctorNonObservedCents: number;
  proctorObservedCents: number;
};

export const FALLBACK_KIT_CENTS = 3900;

export const QT_DEFAULT_PRICING: QtPricing = {
  kitCents: {},
  shippingCents: 3900,
  shipping2DayCents: 2500,
  shippingGroundCents: 1500,
  proctorNonObservedCents: 3000,
  proctorObservedCents: 6000,
};

export const SHIPPING = ["Overnight", "Second day", "Ground"] as const;
export type Shipping = (typeof SHIPPING)[number];
export const isShipping = (v: unknown): v is Shipping => (SHIPPING as readonly unknown[]).includes(v);
export const shippingCents = (method: string | undefined, pr: QtPricing) =>
  method === "Ground" ? pr.shippingGroundCents : method === "Second day" ? pr.shipping2DayCents : pr.shippingCents;

export type Specimen = "Oral fluid" | "Urine";
export const specimenOf = (testType?: string): Specimen | null =>
  testType?.startsWith("Oral") ? "Oral fluid" : testType?.startsWith("Urine") ? "Urine" : null;

// Preset panels per specimen, taken from the kits Labb stocks.
const PRESET_KITS: Record<Specimen, { standard: string; expanded: string }> = {
  "Oral fluid": { standard: "or-06a-etest-swab", expanded: "or-14a-etest-swab" },
  Urine: { standard: "ua-06b-svt", expanded: "ua-16c-svt" },
};
const kitBySlug = (slug: string) => publishedKits.find((k) => k.slug === slug);

export const PANELS = ["Help me choose", "Standard panel", "Expanded panel", "Custom panel"] as const;
export type Panel = (typeof PANELS)[number];

export function presetDrugs(specimen: Specimen, panel: Panel): string[] {
  const slug = panel === "Standard panel" ? PRESET_KITS[specimen].standard : panel === "Expanded panel" ? PRESET_KITS[specimen].expanded : "";
  return kitBySlug(slug)?.drugs.map((d) => d.code) || [];
}

const kitsFor = (specimen: Specimen) => publishedKits.filter((k) => k.specimen === specimen);

// Every drug any stocked kit of this specimen can test, for the custom list.
export function drugCatalog(specimen: Specimen) {
  const m = new Map<string, string>();
  for (const k of kitsFor(specimen)) for (const d of k.drugs) if (!m.has(d.code)) m.set(d.code, d.name);
  return [...m].map(([code, name]) => ({ code, name }));
}

// Smallest stocked kit that covers every selected drug (Flex Testing removes the rest).
export function kitForSelection(specimen: Specimen, codes: string[]): Kit | null {
  return kitsFor(specimen)
    .filter((k) => codes.every((c) => k.drugs.some((d) => d.code === c)))
    .sort((a, b) => a.drugCount - b.drugCount)[0] || null;
}

// A drug can be added only if some kit still covers the selection with it.
export const canAdd = (specimen: Specimen, codes: string[], code: string) => Boolean(kitForSelection(specimen, [...codes, code]));

export const kitPriceCents = (kit: Kit | null | undefined, pr: QtPricing) => (kit && pr.kitCents[kit.slug]) || FALLBACK_KIT_CENTS;
// Lowest kit price for a specimen (or across all kits), used for "Help me choose" and "From" prices.
export function lowestKitCents(pr: QtPricing, specimen?: Specimen | null) {
  const list = publishedKits.filter((k) => !specimen || k.specimen === specimen).map((k) => kitPriceCents(k, pr));
  return list.length ? Math.min(...list) : FALLBACK_KIT_CENTS;
}
export const isObserved = (observation?: string) => Boolean(observation?.startsWith("Observed"));

export const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

// Resolve an order's drugs, kit and fees. Returns an error message for an invalid custom selection.
export function quote(testType: string | undefined, panel: string | undefined, custom: string[] = [], observation?: string, pr: QtPricing = QT_DEFAULT_PRICING, method: string = "Overnight") {
  const specimen = specimenOf(testType);
  const p = (PANELS as readonly string[]).includes(panel || "") ? (panel as Panel) : "Help me choose";
  let drugs: string[] = [];
  let kit: Kit | null = null;
  let error = "";
  if (specimen && p !== "Help me choose") {
    drugs = p === "Custom panel" ? [...new Set(custom)] : presetDrugs(specimen, p);
    if (p === "Custom panel" && !drugs.length) error = "Choose at least one drug.";
    else {
      kit = kitForSelection(specimen, drugs);
      if (!kit) error = "Those drugs can't be combined in one test. Remove one and try again.";
    }
  }
  const screen = kit ? kitPriceCents(kit, pr) : lowestKitCents(pr, specimen);
  const shipping = shippingCents(method, pr);
  const proctoring = observation ? (isObserved(observation) ? pr.proctorObservedCents : pr.proctorNonObservedCents) : 0;
  return { drugs, kit, error, fees: { screen, shipping, proctoring }, cents: screen + shipping + proctoring };
}
