// Quick Test panels and pricing. Shared by the checkout form (live price) and the server (the price
// actually charged), so the browser can never set its own total.
import { publishedKits, type Kit } from "@/lib/kits";

// PLACEHOLDER PRICES: replace with Labb's real Quick Test pricing.
// Same price at home or at a clinic. A test includes the first `includedDrugs` drugs; each drug
// after that adds `perDrugCents`.
export const QT_PRICING = {
  baseCents: 7900,
  includedDrugs: 6,
  perDrugCents: 500,
};

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

export function priceCents(drugCount: number) {
  const extra = Math.max(0, drugCount - QT_PRICING.includedDrugs);
  return QT_PRICING.baseCents + extra * QT_PRICING.perDrugCents;
}

export const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

// Resolve an order's drugs, kit and price. Returns an error message for an invalid custom selection.
export function quote(testType: string | undefined, panel: string | undefined, custom: string[] = []) {
  const specimen = specimenOf(testType);
  const p = (PANELS as readonly string[]).includes(panel || "") ? (panel as Panel) : "Help me choose";
  if (!specimen || p === "Help me choose") return { drugs: [] as string[], kit: null, cents: priceCents(QT_PRICING.includedDrugs), error: "" };
  const drugs = p === "Custom panel" ? [...new Set(custom)] : presetDrugs(specimen, p);
  if (p === "Custom panel" && !drugs.length) return { drugs, kit: null, cents: priceCents(0), error: "Choose at least one drug." };
  const kit = kitForSelection(specimen, drugs);
  if (!kit) return { drugs, kit: null, cents: priceCents(drugs.length), error: "Those drugs can't be combined in one test. Remove one and try again." };
  return { drugs, kit, cents: priceCents(drugs.length), error: "" };
}
