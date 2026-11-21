import "server-only";
import { sql } from "@/lib/db";

// Background check pricing for CPP members: Labb's cost plus 10%, rounded up to the nearest $0.05.
export const CPP_MARKUP_PCT = 10;
export const cppBackgroundCents = (costCents: number) => Math.ceil((costCents * (100 + CPP_MARKUP_PCT)) / 500) * 5;

export const BG_CATEGORIES = ["Packages", "Criminal", "Sanctions and watch lists", "Identity", "Verifications", "Driving", "Civil and credit", "Media"] as const;

export type BackgroundPrice = {
  id: string; ref: string; kind: "package" | "check"; category: string; name: string; includes: string | null;
  cost_cents: number; note: string | null; sort: number; active: boolean; updated_at: Date;
};

export async function backgroundPrices(activeOnly = true) {
  const rows = await sql()<BackgroundPrice[]>`
    select id, ref, kind, category, name, includes, cost_cents, note, sort, active, updated_at
    from cpp_background_prices where (${!activeOnly} or active) order by sort, lower(name)`;
  return rows;
}
