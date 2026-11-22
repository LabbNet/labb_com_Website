import "server-only";
import { sql } from "@/lib/db";
import type { ListAudience } from "@/lib/broadcast";

// Opt-in contacts imported from a CSV export (HubSpot, Labb Station or another source).
export const SOURCES = [
  { value: "hubspot", label: "HubSpot" },
  { value: "labb-station", label: "Labb Station platform" },
  { value: "other", label: "Other" },
] as const;
export const isSource = (v: string) => SOURCES.some((s) => s.value === v);
export const sourceLabel = (v: string) => SOURCES.find((s) => s.value === v)?.label ?? v;

export const LIST_LABELS: Record<ListAudience, string> = {
  employers: "Employers", clinics: "Clinics", treatment: "Treatment centers", corrections: "Corrections",
};
export const isList = (v: string): v is ListAudience => v in LIST_LABELS;

// RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = "";
  let q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { f += '"'; i++; }
      else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(f); f = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else f += c;
  }
  row.push(f);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

// Header names from HubSpot, Labb Station and common exports, matched loosely.
const HEADERS: Record<string, string[]> = {
  email: ["email", "emailaddress", "email address", "e-mail", "workemail"],
  first_name: ["firstname", "first name", "first"],
  last_name: ["lastname", "last name", "last"],
  company: ["company", "companyname", "company name", "organization", "organisation", "clinic", "account"],
  address: ["address", "streetaddress", "street address", "address1", "address line 1", "address line one"],
  address2: ["address2", "address line 2", "address line two", "suite"],
  city: ["city"],
  state: ["state", "state/region", "stateregion", "province"],
  zip: ["zip", "zipcode", "zip code", "postalcode", "postal code", "postal"],
  phone: ["phone", "phonenumber", "phone number", "mobile", "mobilephonenumber", "mobile phone number"],
};
const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9/ ]/g, "").trim();

const EMAIL = /^[^\s@,;]{1,64}@[^\s@,;]{1,190}\.[a-z]{2,}$/i;

export async function importContacts(text: string, source: string, batch: string, list: ListAudience | null = null, adminId: string | null = null) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "The file has no rows." };
  const head = rows[0].map(norm);
  const col: Record<string, number> = {};
  for (const [k, names] of Object.entries(HEADERS)) {
    const i = head.findIndex((h) => names.includes(h) || names.includes(h.replace(/ /g, "")));
    if (i >= 0) col[k] = i;
  }
  if (col.email === undefined) return { error: "No email column found. The first row must have column names, including Email." };
  const seen = new Set<string>();
  const good: Record<string, string | null>[] = [];
  let invalid = 0;
  let dupes = 0;
  for (const r of rows.slice(1)) {
    const get = (k: string) => (col[k] === undefined ? null : (r[col[k]] ?? "").trim().slice(0, 200) || null);
    const email = (get("email") || "").toLowerCase();
    if (!EMAIL.test(email)) { invalid++; continue; }
    if (seen.has(email)) { dupes++; continue; }
    seen.add(email);
    good.push({ email, first_name: get("first_name"), last_name: get("last_name"), company: get("company"), address: get("address"),
      address2: get("address2"), city: get("city"), state: get("state"), zip: get("zip"), phone: get("phone") });
  }
  const db = sql();
  // Cross-reference before writing: contacts already on file are never duplicated, and website leads are counted.
  const emails = good.map((g) => g.email as string);
  const known = await db<{ email: string; status: string; list: string | null }[]>`
    select lower(email) as email, status, list from contact_imports where lower(email) = any(${emails})`;
  const leadHits = await db<{ email: string }[]>`select distinct lower(email) as email from leads where lower(email) = any(${emails})`;
  let added = 0;
  for (let i = 0; i < good.length; i += 500) {
    const chunk = good.slice(i, i + 500).map((g) => ({ ...g, source, batch })) as Record<string, string | null>[];
    // New addresses go to the chosen list (or Pending). Known addresses only get blank fields filled in.
    const res = await db<{ inserted: boolean }[]>`
      insert into contact_imports ${db(chunk, "email", "first_name", "last_name", "company", "address", "address2", "city", "state", "zip", "phone", "source", "batch")}
      on conflict (lower(email)) do update set
        first_name = coalesce(contact_imports.first_name, excluded.first_name), last_name = coalesce(contact_imports.last_name, excluded.last_name),
        company = coalesce(contact_imports.company, excluded.company), address = coalesce(contact_imports.address, excluded.address),
        address2 = coalesce(contact_imports.address2, excluded.address2), city = coalesce(contact_imports.city, excluded.city),
        state = coalesce(contact_imports.state, excluded.state), zip = coalesce(contact_imports.zip, excluded.zip),
        phone = coalesce(contact_imports.phone, excluded.phone), updated_at = now()
      returning (xmax = 0) as inserted`;
    added += res.filter((x) => x.inserted).length;
  }
  // Put new contacts, and known ones still waiting in Pending, on the chosen list. Contacts someone already
  // sorted onto a list, or set aside, keep that decision.
  let listed = 0;
  if (list) {
    const r = await db`update contact_imports set status = 'assigned', list = ${list}, assigned_by = ${adminId}, assigned_at = now(), updated_at = now()
      where lower(email) = any(${emails}) and status = 'pending'`;
    listed = r.count;
  }
  const already = known.filter((k) => k.status !== "pending").length;
  const otherList = list ? known.filter((k) => k.status === "assigned" && k.list !== list).length : 0;
  const ignored = known.filter((k) => k.status === "ignored").length;
  return { added, updated: good.length - added, invalid, dupes, total: rows.length - 1, listed, already, otherList, ignored, leads: leadHits.length };
}
