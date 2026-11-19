import "server-only";
import { sql } from "@/lib/db";

// Queries for Admin -> Analytics. All times are grouped in US Eastern time.
export const RANGES = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days", "365": "Last 12 months" } as const;
export type RangeKey = keyof typeof RANGES;
const TZ = "America/New_York";

type F = { days: number; staff: boolean };

function where(f: F, offsetDays = 0) {
  const db = sql();
  const from = db`now() - make_interval(days => ${f.days + offsetDays})`;
  const to = db`now() - make_interval(days => ${offsetDays})`;
  // Leave out Labb admins' own browsing unless asked.
  const staff = f.staff ? db`true` : db`coalesce(role, '') <> 'admin'`;
  return db`ts >= ${from} and ts < ${to} and ${staff}`;
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
