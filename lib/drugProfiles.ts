import data from "@/content/drug-profiles.json";
import { drugSheet } from "@/lib/drugSheets";
import { publishedKits, type Kit } from "@/lib/kits";

// Public drug pages built from the Labb Drug Profile Series PDFs (content/drug-profiles.json is generated
// from the PDFs in private/drug-sheets). The full PDF stays gated: CPP members download it directly,
// everyone else gets it after a short form.
export type DrugProfile = {
  no: number; slug: string; drug: string; drugClass: string; version: string; index: number; level: string; kicker: string;
  bottom: string; what: string; how: string | null; used: string[]; signs: string[]; work: string[];
  assay: string | null; specimen: string | null; available: string | null; reading: string | null;
};

export const drugProfiles = data as DrugProfile[];
export const drugProfile = (slug: string) => drugProfiles.find((d) => d.slug === slug);

// Kit drug codes that correspond to each assay (some sheets use a different code than the kit label).
const ALIASES: Record<string, string[]> = { FEN: ["FEN", "FTY"], OPI: ["OPI", "MOP"], OXY: ["OXY"], K3: ["K2", "K3"], MDMA: ["MDMA"], BAC: ["ALC", "BAC"] };
export function kitsFor(p: DrugProfile): { kit: Kit; cutoff: string }[] {
  if (!p.assay) return [];
  const codes = ALIASES[p.assay] ?? [p.assay];
  return publishedKits.flatMap((k) => {
    const d = k.drugs.find((x) => codes.includes(x.code));
    return d ? [{ kit: k, cutoff: d.cutoff }] : [];
  });
}

export const profileFile = (slug: string) => drugSheet(slug)?.file;
export const levelClass = (level: string) => (level === "High" ? "lvl-high" : level === "Moderate" ? "lvl-mod" : "lvl-low");
