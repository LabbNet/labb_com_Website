import "server-only";
import { sql } from "@/lib/db";
import { mergeLeads, type LeadRow } from "@/lib/leads";

// Likely duplicate leads: same person or organization under a different email or spelling.
// Exact email matches are merged automatically when a form comes in (see saveLeadDetailed); this finds the rest
// and puts each pair in a review queue (Admin -> Leads -> Possible duplicates).

const FREE = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com", "live.com", "msn.com", "comcast.net", "att.net", "me.com", "proton.me", "protonmail.com", "ymail.com", "sbcglobal.net", "verizon.net", "bellsouth.net", "cox.net", "charter.net", "mail.com", "gmx.com", "labb.com"];
const GENERIC = ["info", "admin", "office", "contact", "sales", "hr", "support", "hello", "billing", "accounts", "frontdesk", "reception", "manager", "test"];
export const FLAG_MIN = 50;

let metaphone: boolean | null = null;
async function hasMetaphone() {
  if (metaphone === null) {
    const [r] = await sql()<{ ok: boolean }[]>`select exists (select 1 from pg_extension where extname = 'fuzzystrmatch') as ok`.catch(() => [{ ok: false }]);
    metaphone = r.ok;
  }
  return metaphone;
}

// Scores every pair (or only pairs with one lead) and records new pairs at or above FLAG_MIN.
export async function scanDupes(leadId?: string) {
  const db = sql();
  const mp = await hasMetaphone();
  const sounds = mp ? db`(a.ln <> '' and a.ln <> b.ln and dmetaphone(a.ln) = dmetaphone(b.ln) and (left(a.fn, 1) = left(b.fn, 1) or a.fn = '' or b.fn = ''))` : db`false`;
  const one = leadId && /^\d+$/.test(leadId) ? leadId : null;
  const rows = await db<{ a: string; b: string; score: number; reasons: string[] }[]>`
    with n as (
      select id, lower(email) as email, split_part(lower(email), '@', 1) as local, split_part(lower(email), '@', 2) as dom,
        lower(trim(coalesce(first_name, ''))) as fn, lower(trim(coalesce(last_name, ''))) as ln,
        lower(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) as nm,
        right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 10) as ph,
        trim(regexp_replace(regexp_replace(lower(coalesce(company, '')), '[^a-z0-9 ]', ' ', 'g'), '\\m(llc|inc|corp|corporation|co|company|ltd|pllc|pc|the|of|and)\\M', '', 'g')) as co,
        lower(coalesce(city, '')) as city, lower(coalesce(state, '')) as st
      from leads where type <> 'quick-test' and segment <> 'individual'
    ),
    p as (
      select a.id as a, b.id as b,
        (a.ph <> '' and length(a.ph) = 10 and a.ph = b.ph) as phone,
        (length(a.local) >= 4 and a.local = b.local and not (a.local = any(${GENERIC}))) as local,
        (a.dom <> '' and a.dom = b.dom and not (a.dom = any(${FREE}))) as dom,
        (length(a.co) >= 3 and a.co = b.co) as co_same,
        (length(a.co) >= 3 and length(b.co) >= 3 and a.co <> b.co and similarity(a.co, b.co) >= 0.6) as co_like,
        (a.fn <> '' and a.ln <> '' and a.nm = b.nm) as nm_same,
        (length(a.nm) >= 5 and length(b.nm) >= 5 and a.nm <> b.nm and similarity(a.nm, b.nm) >= 0.55) as nm_like,
        ${sounds} as sounds,
        (a.city <> '' and a.city = b.city and a.st = b.st) as place
      from n a join n b on a.id < b.id and a.email <> b.email
      where (${one}::bigint is null or a.id = ${one}::bigint or b.id = ${one}::bigint)
        and ((length(a.ph) = 10 and a.ph = b.ph) or (length(a.local) >= 4 and a.local = b.local) or (a.dom = b.dom and not (a.dom = any(${FREE})))
          or (a.co <> '' and a.co = b.co) or (a.ln <> '' and a.ln = b.ln)
          or (length(a.nm) >= 5 and a.nm % b.nm) or (length(a.co) >= 3 and a.co % b.co) or ${sounds})
    )
    select a::text, b::text,
      (case when phone then 60 else 0 end + case when local then 45 else 0 end + case when dom then 25 else 0 end
       + case when co_same then 40 when co_like then 30 else 0 end + case when nm_same then 45 when nm_like then 35 else 0 end
       + case when sounds and not nm_same and not nm_like then 35 else 0 end + case when place then 10 else 0 end)::int as score,
      array_remove(array[
        case when phone then 'Same phone number' end, case when local then 'Same email name, different domain' end,
        case when dom then 'Same company email domain' end, case when co_same then 'Same company' when co_like then 'Similar company name' end,
        case when nm_same then 'Same name' when nm_like then 'Similar name spelling' end,
        case when sounds and not nm_same and not nm_like then 'Last name sounds the same' end, case when place then 'Same city' end
      ], null) as reasons
    from p`;
  let added = 0;
  for (const r of rows.filter((x) => x.score >= FLAG_MIN)) {
    const res = await db`insert into lead_dupe_flags (lead_a, lead_b, score, reasons) values (${r.a}, ${r.b}, ${r.score}, ${r.reasons})
      on conflict (lead_a, lead_b) do update set score = excluded.score, reasons = excluded.reasons where lead_dupe_flags.status = 'open' returning (xmax = 0) as fresh`;
    if (res[0]?.fresh) added++;
  }
  return added;
}

// One person, several leads with the same email: fold them into the oldest record.
export async function consolidateSameEmail() {
  const db = sql();
  const groups = await db<{ ids: string[] }[]>`
    select array_agg(id::text order by created_at) as ids from leads where type <> 'quick-test'
    group by lower(email) having count(*) > 1 limit 500`;
  let merged = 0;
  for (const g of groups) {
    try {
      merged += await mergeLeads(g.ids[0], g.ids.slice(1), { id: null as never, name: "Labb (automatic)" });
      await db`update leads set type = coalesce((select type from leads where id = ${g.ids[0]} and type <> 'newsletter'), type) where id = ${g.ids[0]}`;
    } catch (e) {
      console.warn("[dupes] could not merge", g.ids.join(","), e instanceof Error ? e.message : e);
      // Same email but held by different CPP members: put it in the review queue instead.
      for (const other of g.ids.slice(1)) {
        const [x, y] = [g.ids[0], other].sort((p, q) => Number(p) - Number(q));
        await db`insert into lead_dupe_flags (lead_a, lead_b, score, reasons) values (${x}, ${y}, 100, ${["Same email, held by different CPP members"]}) on conflict do nothing`;
      }
    }
  }
  return merged;
}

export async function runDupeJobs() {
  try {
    const merged = await consolidateSameEmail();
    const flagged = await scanDupes();
    if (merged || flagged) console.log(`[dupes] merged ${merged} repeat submissions, flagged ${flagged} possible duplicates`);
  } catch (e) {
    console.error("[dupes] job failed", e);
  }
}

type DupeLead = LeadRow & { partner: string | null; meetings: number; events: number };
export type DupeGroup = { key: string; score: number; leads: DupeLead[]; links: { a: string; b: string; score: number; reasons: string[] }[] };

// Open flags grouped into clusters (people or organizations that link to each other), strongest first.
export async function openDupes(limit = 60): Promise<DupeGroup[]> {
  const db = sql();
  const flags = await db<{ score: number; reasons: string[]; a: string; b: string }[]>`
    select score, reasons, lead_a::text as a, lead_b::text as b from lead_dupe_flags where status = 'open' order by score desc limit 3000`;
  if (!flags.length) return [];
  const parent = new Map<string, string>();
  const find = (x: string): string => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
  for (const f of flags) { parent.set(find(f.a), find(f.b)); }
  const groups = new Map<string, DupeGroup>();
  for (const f of flags) {
    const k = find(f.a);
    const g = groups.get(k) ?? { key: k, score: 0, leads: [], links: [] };
    g.links.push(f);
    g.score = Math.max(g.score, f.score);
    groups.set(k, g);
  }
  const top = [...groups.values()].sort((x, y) => y.score - x.score).slice(0, limit);
  const ids = [...new Set(top.flatMap((g) => g.links.flatMap((l) => [l.a, l.b])))];
  const leads = await db<DupeLead[]>`
    select l.*, coalesce(p.clinic, p.name) as partner,
      (select count(*)::int from lead_meetings g where g.lead_id = l.id) as meetings,
      (select count(*)::int from lead_events e where e.lead_id = l.id) as events
    from leads l left join members p on p.id = l.partner_id where l.id = any(${ids}::bigint[]) order by l.created_at`;
  const by = new Map(leads.map((l) => [String(l.id), l]));
  for (const g of top) g.leads = [...new Set(g.links.flatMap((l) => [l.a, l.b]))].map((id) => by.get(id)!).filter(Boolean).sort((x, y) => +new Date(x.created_at) - +new Date(y.created_at));
  return top.filter((g) => g.leads.length > 1);
}

// Number of groups waiting for review.
export async function openDupeCount() {
  return (await openDupes(1000).catch(() => [])).length;
}

export async function dupesFor(leadId: string) {
  return sql()<{ id: string; other: string; score: number; reasons: string[]; name: string | null; email: string; company: string | null }[]>`
    select f.id, o.id::text as other, f.score, f.reasons, nullif(trim(coalesce(o.first_name, '') || ' ' || coalesce(o.last_name, '')), '') as name, o.email, o.company
    from lead_dupe_flags f join leads o on o.id = case when f.lead_a = ${leadId}::bigint then f.lead_b else f.lead_a end
    where f.status = 'open' and (f.lead_a = ${leadId}::bigint or f.lead_b = ${leadId}::bigint) order by f.score desc`.catch(() => []);
}
