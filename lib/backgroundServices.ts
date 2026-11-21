import "server-only";
import { sql, dbConfigured } from "@/lib/db";

// Public list of background check services (no prices, no vendors), from the same list CPP pricing uses.
export type BgService = { ref: string; kind: "package" | "check"; category: string; name: string; includes: string | null; note: string | null };

export async function backgroundServices(): Promise<BgService[]> {
  if (!dbConfigured) return [];
  try {
    return await sql()<BgService[]>`select ref, kind, category, name, includes, note from cpp_background_prices where active order by sort, lower(name)`;
  } catch {
    return [];
  }
}
