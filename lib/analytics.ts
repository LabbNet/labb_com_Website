import "server-only";
import { sql } from "@/lib/db";

// Queries for Admin -> Analytics. All times are grouped in US Eastern time.
export const RANGES = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days", "365": "Last 12 months" } as const;
export type RangeKey = keyof typeof RANGES;
const TZ = "America/New_York";

export const TRAFFIC = { prospects: "Prospects", customers: "Customers (logins)", all: "All traffic" } as const;
export type Traffic = keyof typeof TRAFFIC;
type F = { days: number; staff: boolean; traffic?: Traffic };

function where(f: F, offsetDays = 0) {
  const db = sql();
  const from = db`now() - make_interval(days => ${f.days + offsetDays})`;
  const to = db`now() - make_interval(days => ${offsetDays})`;
  // Leave out Labb admins' own browsing unless asked.
  const staff = f.staff ? db`true` : db`coalesce(role, '') <> 'admin'`;
  // Prospects leave out visits where someone clicked a login or used the member or course areas.
  const t = f.traffic ?? "all";
  const who = t === "all" ? db`true` : t === "customers" ? db`session in (select session from customer_sessions)` : db`session not in (select session from customer_sessions)`;
  return db`ts >= ${from} and ts < ${to} and ${staff} and ${who} and left(path, 3) <> '/__' and left(path, 6) <> '/reads' and coalesce(role, '') <> 'reader'`; // (a LIKE with \_ here lost its escape in the template string and hid most pages)
}

export type Kpis = { views: number; visitors: number; sessions: number; avg_ms: number | null; bounce: number | null; members: number; returning: number };

export async function kpis(f: F, offsetDays = 0): Promise<Kpis> {
  const db = sql();
  const w = where(f, offsetDays);
  const [r] = await db<Kpis[]>`
    with v as (select * from page_views where ${w}),
    s as (select session, count(*) as n from v group by session),
    firstseen as (select visitor, min(ts) as first from page_views group by visitor)
    select
      (select count(*)::int from v) as views,
      (select count(distinct visitor)::int from v) as visitors,
      (select count(*)::int from s) as sessions,
      (select round(avg(least(duration_ms, 600000)))::int from v where duration_ms between 1000 and 3600000) as avg_ms,
      (select round(100.0 * count(*) filter (where n = 1) / nullif(count(*), 0))::int from s) as bounce,
      (select count(distinct member_id)::int from v where member_id is not null) as members,
      (select count(distinct v.visitor)::int from v join firstseen fs using (visitor) where fs.first < v.ts - interval '30 minutes'
         and fs.first < (select min(ts) from v)) as returning`;
  return r;
}

export async function daily(f: F) {
  return sql()<{ day: string; views: number; visitors: number }[]>`
    with days as (
      select generate_series((now() at time zone ${TZ})::date - (${f.days} - 1), (now() at time zone ${TZ})::date, interval '1 day')::date as day
    )
    select to_char(d.day, 'YYYY-MM-DD') as day, coalesce(count(p.id), 0)::int as views, coalesce(count(distinct p.visitor), 0)::int as visitors
    from days d left join page_views p on (p.ts at time zone ${TZ})::date = d.day and ${where(f)}
    group by d.day order by d.day`;
}

export async function topPages(f: F, limit = 25) {
  return sql()<{ path: string; title: string | null; views: number; visitors: number; avg_ms: number | null }[]>`
    select path, (array_agg(title order by ts desc))[1] as title, count(*)::int as views, count(distinct visitor)::int as visitors,
      round(avg(least(duration_ms, 600000)) filter (where duration_ms between 1000 and 3600000))::int as avg_ms
    from page_views where ${where(f)} group by path order by views desc limit ${limit}`;
}

export async function entryPages(f: F, limit = 10) {
  return sql()<{ path: string; sessions: number }[]>`
    select path, count(*)::int as sessions from (
      select distinct on (session) session, path from page_views where ${where(f)} order by session, ts
    ) e group by path order by sessions desc limit ${limit}`;
}

export async function breakdown(f: F, col: "referrer" | "device" | "browser" | "os" | "utm_campaign" | "utm_source", limit = 10) {
  const db = sql();
  return db<{ label: string; visitors: number; views: number }[]>`
    select coalesce(${db(col)}, ${col === "referrer" ? "Direct or unknown" : "Unknown"}) as label,
      count(distinct visitor)::int as visitors, count(*)::int as views
    from page_views where ${where(f)} ${col.startsWith("utm") ? db`and ${db(col)} is not null` : db``}
    group by 1 order by visitors desc limit ${limit}`;
}

export async function signedIn(f: F, limit = 50) {
  return sql()<{ id: string; name: string; clinic: string | null; role: string; views: number; sessions: number; last_seen: Date; top_path: string | null; areas: string | null }[]>`
    select m.id, m.name, m.clinic, m.role, count(*)::int as views, count(distinct p.session)::int as sessions, max(p.ts) as last_seen,
      mode() within group (order by p.path) as top_path,
      string_agg(distinct case when p.path like '/members%' then 'CPP area' when p.path like '/learn%' then 'Courses' when p.path like '/certifications%' then 'Certifications' else null end, ', ') as areas
    from (select * from page_views where ${where(f)}) p join members m on m.id = p.member_id
    group by m.id order by last_seen desc limit ${limit}`;
}

export async function liveCount() {
  const [r] = await sql()<{ n: number }[]>`select count(distinct visitor)::int as n from page_views
    where ts > now() - interval '30 minutes' and coalesce(role, '') <> 'admin'`;
  return r.n;
}

export async function live() {
  return sql()<{ path: string; visitors: number }[]>`
    select path, count(distinct visitor)::int as visitors from page_views
    where ts > now() - interval '30 minutes' and coalesce(role, '') <> 'admin' group by path order by visitors desc limit 8`;
}

export async function totalRows() {
  const [r] = await sql()<{ n: number; first: Date | null }[]>`select count(*)::int as n, min(ts) as first from page_views`;
  return r;
}

// Form completions (website leads) in the same window. Quick Test orders count once paid or submitted.
export const FORM_LABELS: Record<string, string> = {
  quote: "Get a quote",
  contact: "Contact",
  demo: "Demo request",
  "early-access": "Early access",
  clinic: "Clinic or collection site",
  handbook: "Guidebook and drug profile downloads",
  sample: "Sample request",
  "certification-waitlist": "Certification waitlist",
  newsletter: "Newsletter",
  "quick-test": "Quick Test order",
  "cpp-application": "CPP application",
  "partner-added": "Added by a CPP member",
};

function leadWhere(f: F, offsetDays = 0) {
  const db = sql();
  return db`created_at >= now() - make_interval(days => ${f.days + offsetDays}) and created_at < now() - make_interval(days => ${offsetDays}) and type <> 'partner-added'`;
}

export async function formTotals(f: F, offsetDays = 0) {
  const [r] = await sql()<{ forms: number; leads: number }[]>`
    select count(*)::int as forms, count(*) filter (where type <> 'newsletter')::int as leads from leads where ${leadWhere(f, offsetDays)}`;
  return r;
}

export async function formsByType(f: F) {
  return sql()<{ type: string; n: number }[]>`
    select type, count(*)::int as n from leads where ${leadWhere(f)} group by type order by n desc`;
}

// Completions per page with that page's visitors, so each form's conversion rate can be shown.
export async function formsByPage(f: F, limit = 15) {
  const db = sql();
  return db<{ page: string; n: number; visitors: number }[]>`
    with l as (
      select coalesce(nullif(split_part(split_part(page, '?', 1), '#', 1), ''), '(unknown)') as page, count(*)::int as n
      from leads where ${leadWhere(f)} group by 1
    )
    select l.page, l.n, coalesce((select count(distinct visitor)::int from page_views where path = l.page and ${where(f)}), 0) as visitors
    from l order by l.n desc limit ${limit}`;
}

export async function formsDaily(f: F) {
  return sql()<{ day: string; n: number }[]>`
    with days as (
      select generate_series((now() at time zone ${TZ})::date - (${f.days} - 1), (now() at time zone ${TZ})::date, interval '1 day')::date as day
    )
    select to_char(d.day, 'YYYY-MM-DD') as day, count(l.id)::int as n
    from days d left join leads l on (l.created_at at time zone ${TZ})::date = d.day and ${leadWhere(f)}
    group by d.day order by d.day`;
}

// ---- Visitor identification ----
// Organizations behind visits (IP lookup), with the leads whose email domain matches.
export async function companies(f: F, limit = 40) {
  return sql()<{ org: string; org_domain: string | null; visitors: number; sessions: number; views: number; last_seen: Date; top_path: string | null; pricing: boolean; lead_id: string | null; lead_name: string | null }[]>`
    select p.org, p.org_domain, count(distinct p.visitor)::int as visitors, count(distinct p.session)::int as sessions, count(*)::int as views,
      max(p.ts) as last_seen, mode() within group (order by p.path) as top_path,
      bool_or(p.path ~ '^/(quick-test|get-a-quote|channel-partner-program|test-kits)') as pricing,
      (select l.id::text from leads l where p.org_domain is not null and lower(split_part(l.email, '@', 2)) = lower(max(p.org_domain)) order by l.created_at desc limit 1) as lead_id,
      (select coalesce(nullif(trim(coalesce(l.company, '') ), ''), l.email) from leads l where p.org_domain is not null and lower(split_part(l.email, '@', 2)) = lower(max(p.org_domain)) order by l.created_at desc limit 1) as lead_name
    from (select * from page_views where ${where(f)} and org is not null and org_kind in ('business', 'education', 'government')) p
    group by p.org, p.org_domain order by last_seen desc limit ${limit}`;
}

// People recognized from a form or an email click, and what they looked at.
export async function knownVisitors(f: F, limit = 40) {
  return sql()<{ email: string; lead_id: string | null; name: string | null; company: string | null; source: string; sessions: number; views: number; last_seen: Date; top_path: string | null; org: string | null }[]>`
    select k.email, max(k.lead_id::text) as lead_id,
      (select nullif(trim(coalesce(l.first_name, '') || ' ' || coalesce(l.last_name, '')), '') from leads l where l.id = max(k.lead_id)) as name,
      (select l.company from leads l where l.id = max(k.lead_id)) as company,
      string_agg(distinct k.source, ', ') as source,
      count(distinct p.session)::int as sessions, count(p.id)::int as views, max(p.ts) as last_seen,
      mode() within group (order by p.path) as top_path, max(p.org) as org
    from visitor_links k join (select * from page_views where ${where(f)}) p on p.visitor = k.visitor
    group by k.email order by last_seen desc limit ${limit}`;
}

export async function identifiedShare(f: F) {
  const [r] = await sql()<{ sessions: number; with_org: number; known: number }[]>`
    select count(distinct session)::int as sessions,
      count(distinct session) filter (where org_kind in ('business', 'education', 'government'))::int as with_org,
      count(distinct session) filter (where visitor in (select visitor from visitor_links))::int as known
    from page_views where ${where(f)}`;
  return r;
}

// A lead's website activity across every browser linked to them.
export async function leadActivity(leadId: string, email: string) {
  const db = sql();
  const views = await db<{ ts: Date; path: string; title: string | null; session: string; duration_ms: number | null; referrer: string | null; utm_source: string | null; utm_campaign: string | null; org: string | null; device: string | null }[]>`
    select p.ts, p.path, p.title, p.session, p.duration_ms, p.referrer, p.utm_source, p.utm_campaign, p.org, p.device
    from page_views p
    where p.visitor in (select visitor from visitor_links where lead_id = ${leadId} or lower(email) = ${email.toLowerCase()})
    order by p.ts desc limit 300`;
  return views;
}

export async function customerSessionCount(f: F) {
  const [r] = await sql()<{ n: number; clicks: number }[]>`
    select count(distinct session)::int as n,
      count(distinct session) filter (where session in (select session from session_flags))::int as clicks
    from page_views where ${where({ ...f, traffic: "customers" })}`;
  return r;
}
