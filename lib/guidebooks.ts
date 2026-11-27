import { resources } from "@/lib/resources";

// labb.com/guidebooks: pick clinic or employer, choose guidebooks, fill out the form, get a link by email.
// Hidden from the public until James approves it: until then only signed-in Labb admins can open or use it.
export const GUIDEBOOKS_LIVE = false;

export type Audience = "clinic" | "employer";
export type Guidebook = { slug: string; file: string; title: string; blurb: string; cover: string; for: Audience[] };

const pick = (slug: string, file: string, forWho: Audience[], title?: string): Guidebook => {
  const r = resources.find((x) => x.slug === slug)!;
  return { slug, file, title: title || r.shortTitle, blurb: r.lede, cover: r.cover, for: forWho };
};
// Industry guidebooks are editions of the Employers Guidebook.
const edition = (industry: string) => `Employers Guidebook: ${industry} Edition`;

export const GUIDEBOOKS: Guidebook[] = [
  pick("clinic-owners-guidebook", "clinic-owners-guidebook", ["clinic"]),
  pick("background-screening-guidebook", "background-screening", ["clinic"]),
  pick("employers-guidebook", "employer-guidebook", ["employer"]),
  pick("construction-screening-guidebook", "employer-construction", ["employer"], edition("Construction")),
  pick("manufacturing-screening-guidebook", "employer-manufacturing", ["employer"], edition("Manufacturing")),
  pick("logistics-screening-guidebook", "employer-logistics", ["employer"], edition("Logistics")),
  pick("healthcare-screening-guidebook", "employer-healthcare", ["employer"], edition("Healthcare")),
  pick("hospitality-screening-guidebook", "employer-hospitality", ["employer"], edition("Hospitality")),
  pick("drug-testing-cost-guidebook", "cost-guidebook", ["clinic", "employer"]),
];
export const guidebook = (slug: string) => GUIDEBOOKS.find((g) => g.slug === slug);
export const LATEST_NOTE = "Guidebooks change as the industry and the laws change. We don't recommend downloading them: a saved copy goes out of date. Always come back to labb.com for the most recent edition.";
