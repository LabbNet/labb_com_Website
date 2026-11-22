import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { sql } from "@/lib/db";

// Collection sites for Quick Test buyers who choose to test at a clinic. Built from the Clinics and Clinic
// locations lists in Admin -> Contacts: one entry per business address. Only business details are shared
// (name and address), never the contacts behind them. ZIP code coordinates: US ZIP centroids (MIT licensed).

export type Site = { id: string; name: string; address: string; city: string | null; state: string | null; zip: string; miles: number };
type Row = { name: string; address: string; address2: string | null; city: string | null; state: string | null; zip: string };

let zipCache: Record<string, [number, number]> | null = null;
function zips() {
  if (!zipCache) zipCache = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/zip-coords.json"), "utf8"));
  return zipCache!;
}
export const knownZip = (z: string) => Boolean(zips()[z]);

let siteCache: { at: number; rows: (Row & { id: string; ll: [number, number] })[] } | null = null;
async function allSites() {
  if (siteCache && Date.now() - siteCache.at < 10 * 60_000) return siteCache.rows;
  const rows = await sql()<Row[]>`
    select max(company) as name, max(address) as address, max(address2) as address2, max(city) as city, max(upper(state)) as state, left(max(zip), 5) as zip
    from contact_imports
    where status = 'assigned' and list in ('clinics', 'clinic-locations') and not qt_hidden
      and coalesce(trim(company), '') <> '' and coalesce(trim(address), '') <> '' and zip ~ '^\\d{5}'
    group by lower(trim(company)), lower(trim(address)), left(zip, 5)`;
  const z = zips();
  const out = rows
    .filter((r) => z[r.zip] && !/@|\.com$|\.net$|\.org$/i.test(r.name))
    .map((r) => ({ ...r, ll: z[r.zip], id: createHash("sha1").update(`${r.name}|${r.address}|${r.zip}`.toLowerCase()).digest("hex").slice(0, 12) }));
  siteCache = { at: Date.now(), rows: out };
  return out;
}

function miles(a: [number, number], b: [number, number]) {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function nearbySites(zip: string, limit = 8, maxMiles = 75): Promise<Site[]> {
  const from = zips()[zip];
  if (!from) return [];
  const all = await allSites();
  return all
    .map((s) => ({ s, d: miles(from, s.ll) }))
    .filter((x) => x.d <= maxMiles)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map(({ s, d }) => ({ id: s.id, name: s.name, address: [s.address, s.address2].filter(Boolean).join(", "), city: s.city, state: s.state, zip: s.zip, miles: Math.round(d * 10) / 10 }));
}
