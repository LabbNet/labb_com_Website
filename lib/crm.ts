import "server-only";
import { sql } from "@/lib/db";

// CRM over every person Labb has on file: Contacts (newsletter lists and clinic locations), website leads,
// and CPP members. A person is keyed by lowercase email, or "loc:<contact id>" for a location without email.
// Owner, stage, tags and follow-up live in crm_people; notes, calls, emails, meetings and tasks in crm_activities.

export const STAGES = [
  ["new", "New"], ["contacted", "Contacted"], ["qualified", "Qualified"], ["proposal", "Proposal"],
  ["customer", "Customer"], ["cpp-member", "CPP member"], ["not-interested", "Not interested"],
] as const;
export type Stage = (typeof STAGES)[number][0];
export const stageLabel = (s: string) => STAGES.find(([k]) => k === s)?.[1] ?? "New";
export const isStage = (s: string): s is Stage => STAGES.some(([k]) => k === s);

export const KINDS = [["note", "Note"], ["call", "Call"], ["email", "Email"], ["meeting", "Meeting"], ["task", "Task"]] as const;
export const isKind = (k: string) => KINDS.some(([v]) => v === k);
export const kindLabel = (k: string) => KINDS.find(([v]) => v === k)?.[1] ?? k;

export const TYPE_LABELS: Record<string, string> = { contact: "Contact", location: "Location", lead: "Lead", member: "CPP member", prospect: "CPP prospect", admin: "Labb admin" };

export const keyHref = (key: string) => `/admin/crm/p/${encodeURIComponent(key)}`;
export const isKey = (k: string) => /^[^\s@]{1,64}@[^\s@]{1,190}$/.test(k) || /^loc:\d+$/.test(k);

// Everyone on file, one row per person. Filters run after merging so a search finds a person by any source.
function people() {
  return sql()`
    select lower(c.email) as key, c.email, nullif(trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')), '') as name,
      c.company, c.phone, c.city, upper(c.state) as state, 'contact' as src, c.list as detail, c.created_at
    from contact_imports c where c.email is not null
    union all
    select 'loc:' || c.id, null, null, c.company, c.phone, c.city, upper(c.state), 'location', c.list, c.created_at
    from contact_imports c where c.email is null
    union all
    select lower(l.email), l.email, nullif(trim(coalesce(l.first_name, '') || ' ' || coalesce(l.last_name, '')), ''),
      l.company, l.phone, l.city, upper(l.state), 'lead', l.status, l.created_at
    from leads l where l.email like '%@%'
    union all
    select lower(m.email), m.email, m.name, m.clinic, m.phone, m.city, upper(m.state),
      case when m.role = 'admin' then 'admin' when m.cpp_status = 'prospect' then 'prospect' else 'member' end,
      m.cpp_status, m.created_at
    from members m where m.role <> 'reader'`;
}

export type PersonRow = {
  key: string; email: string | null; name: string | null; company: string | null; phone: string | null; city: string | null; state: string | null;
  types: string[]; stage: string; owner_id: string | null; owner_name: string | null; tags: string[]; follow_up_at: Date | null;
  last_activity: Date | null; open_tasks: number; total: number;
};

export type Filters = { q?: string; type?: string; owner?: string; stage?: string; tag?: string; due?: boolean; page?: number };

export async function searchPeople(f: Filters, per = 50) {
  const db = sql();
  const q = (f.q || "").trim().toLowerCase();
  const like = `%${q}%`;
  const digits = q.replace(/\D/g, "");
  return db<PersonRow[]>`
    with p as (${people()}),
    g as (
      select key, max(email) as email, max(name) as name, max(company) as company, max(phone) as phone, max(city) as city, max(state) as state,
        array_agg(distinct src) as types
      from p group by key
    )
    select g.*, coalesce(cp.stage, 'new') as stage, cp.owner_id, o.name as owner_name, coalesce(cp.tags, '{}') as tags, cp.follow_up_at,
      (select max(a.created_at) from crm_activities a where a.key = g.key) as last_activity,
      (select count(*)::int from crm_activities a where a.key = g.key and a.kind = 'task' and a.done_at is null) as open_tasks,
      count(*) over ()::int as total
    from g left join crm_people cp on cp.key = g.key left join members o on o.id = cp.owner_id
    where (${q} = '' or g.key like ${like} or lower(coalesce(g.name, '')) like ${like} or lower(coalesce(g.company, '')) like ${like}
        or lower(coalesce(g.city, '')) like ${like} or lower(coalesce(g.state, '')) = ${q}
        or (${digits.length >= 4} and regexp_replace(coalesce(g.phone, ''), '\\D', '', 'g') like ${`%${digits}%`})
        or ${q} = any(cp.tags))
      and (${f.type || ""} = '' or ${f.type || ""} = any(g.types))
      and (${f.owner || ""} = '' or (${f.owner || ""} = 'none' and cp.owner_id is null) or cp.owner_id::text = ${f.owner || ""})
      and (${f.stage || ""} = '' or coalesce(cp.stage, 'new') = ${f.stage || ""})
      and (${f.tag || ""} = '' or ${f.tag || ""} = any(cp.tags))
      and (${!f.due} or cp.follow_up_at <= current_date
        or exists (select 1 from crm_activities a where a.key = g.key and a.kind = 'task' and a.done_at is null and a.due_at <= current_date))
    order by (cp.follow_up_at is null), cp.follow_up_at, last_activity desc nulls last, lower(coalesce(g.company, g.name, g.key))
    limit ${per} offset ${((f.page || 1) - 1) * per}`;
}

export async function admins() {
  return sql()<{ id: string; name: string }[]>`select id, name from members where role = 'admin' and status = 'active' order by name`;
}

export async function allTags() {
  return sql()<{ tag: string; n: number }[]>`select t as tag, count(*)::int as n from crm_people, unnest(tags) t group by t order by n desc, t limit 60`;
}

// Open tasks and due follow-ups, for the CRM home.
export async function dueWork(ownerId: string | null) {
  const db = sql();
  const tasks = await db<{ id: string; key: string; body: string; due_at: Date | null; author: string | null; owner_name: string | null }[]>`
    select a.id, a.key, a.body, a.due_at, m.name as author, o.name as owner_name
    from crm_activities a left join members m on m.id = a.author_id left join crm_people cp on cp.key = a.key left join members o on o.id = cp.owner_id
    where a.kind = 'task' and a.done_at is null and (${ownerId === null} or cp.owner_id = ${ownerId} or a.author_id = ${ownerId})
    order by a.due_at nulls last, a.created_at limit 50`;
  return tasks;
}

export async function getPerson(key: string) {
  const db = sql();
  const email = key.startsWith("loc:") ? null : key;
  const locId = key.startsWith("loc:") ? key.slice(4) : null;
  const [contacts, leads, members, meta, acts, runs, sup] = await Promise.all([
    email
      ? db<{ id: string; email: string; first_name: string | null; last_name: string | null; company: string | null; address: string | null; address2: string | null; city: string | null; state: string | null; zip: string | null; phone: string | null; source: string; list: string | null; status: string; created_at: Date }[]>`
          select * from contact_imports where lower(email) = ${email}`
      : db`select * from contact_imports where id = ${locId}`,
    email
      ? db<{ id: string; type: string; status: string; company: string | null; first_name: string | null; last_name: string | null; phone: string | null; city: string | null; state: string | null; segment: string; owner: string; partner_id: string | null; archived: boolean; created_at: Date }[]>`
          select id, type, status, company, first_name, last_name, phone, city, state, segment, owner, partner_id, archived, created_at from leads where lower(email) = ${email} order by created_at desc`
      : [],
    email
      ? db<{ id: string; name: string; clinic: string | null; role: string; status: string; cpp_status: string; phone: string | null; city: string | null; state: string | null; created_at: Date; last_login_at: Date | null }[]>`
          select id, name, clinic, role, status, cpp_status, phone, city, state, created_at, last_login_at from members where lower(email) = ${email}`
      : [],
    db<{ owner_id: string | null; stage: string; tags: string[]; follow_up_at: Date | null }[]>`select owner_id, stage, tags, follow_up_at from crm_people where key = ${key}`,
    db<{ id: string; kind: string; body: string; due_at: Date | null; done_at: Date | null; author: string | null; author_id: string | null; created_at: Date }[]>`
      select a.id, a.kind, a.body, a.due_at, a.done_at, m.name as author, a.author_id, a.created_at
      from crm_activities a left join members m on m.id = a.author_id where a.key = ${key} order by a.created_at desc limit 300`,
    email
      ? db<{ sequence: string; status: string; created_at: Date; sent: number }[]>`
          select r.sequence, r.status, r.created_at, (select count(*)::int from sequence_sends s where s.run_id = r.id and s.status = 'sent') as sent
          from sequence_runs r where lower(r.email) = ${email} order by r.created_at desc`
      : [],
    email ? db<{ audience: string; added_by: string | null; created_at: Date }[]>`select audience, added_by, created_at from email_suppressions where email = ${email}` : [],
  ]);
  const leadIds = leads.map((l) => l.id);
  const events = leadIds.length
    ? await db<{ lead_id: string; event: string; detail: string | null; actor_name: string | null; created_at: Date }[]>`
        select lead_id, event, detail, actor_name, created_at from lead_events where lead_id = any(${leadIds}) order by created_at desc limit 200`
    : [];
  return { email, contacts: contacts as Record<string, unknown>[], leads, members, meta: meta[0] ?? null, acts, runs, sup, events };
}

export async function upsertPerson(key: string, v: { owner_id?: string | null; stage?: string; tags?: string[]; follow_up_at?: string | null }) {
  const db = sql();
  await db`insert into crm_people (key) values (${key}) on conflict do nothing`;
  if (v.owner_id !== undefined) await db`update crm_people set owner_id = ${v.owner_id}, updated_at = now() where key = ${key}`;
  if (v.stage !== undefined) await db`update crm_people set stage = ${v.stage}, updated_at = now() where key = ${key}`;
  if (v.tags !== undefined) await db`update crm_people set tags = ${v.tags}, updated_at = now() where key = ${key}`;
  if (v.follow_up_at !== undefined) await db`update crm_people set follow_up_at = ${v.follow_up_at}, updated_at = now() where key = ${key}`;
}
