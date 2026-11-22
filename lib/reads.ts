import "server-only";
import { redirect } from "next/navigation";
import { currentMember, type Member } from "@/lib/auth";
import { dbConfigured, sql } from "@/lib/db";

// Reads schedule: on-call shifts for read admins, approvals, and hours for pay.
// Roles: read admin (read_role 'reader') schedules themselves and sees their own hours; super read admin
// (read_role 'super') also sees everyone's hours; the approver (read_approver) approves schedule requests and
// pay card changes, and can schedule anyone directly. Labb admins can manage the read team.
// Hours are counted on the Eastern-time date a shift starts.

export const TZ = "America/New_York";

export type ReadAccess = { m: Member; reader: boolean; superRead: boolean; approver: boolean; admin: boolean };

export async function readAccess(): Promise<ReadAccess | null> {
  const m = await currentMember();
  if (!m) return null;
  const [r] = await sql()<{ read_role: string | null; read_approver: boolean }[]>`select read_role, read_approver from members where id = ${m.id}`;
  const approver = Boolean(r?.read_approver);
  const superRead = r?.read_role === "super" || approver;
  const reader = Boolean(r?.read_role) || approver;
  return { m, reader, superRead, approver, admin: m.role === "admin" };
}

// Page guard: anyone on the read team, or a Labb admin.
export async function requireReads(next: string) {
  if (!dbConfigured) redirect("/login?error=unavailable");
  const a = await readAccess();
  if (!a) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!a.reader && !a.admin) redirect(a.m.role === "learner" ? "/learn" : "/members");
  return a;
}

export type Shift = {
  id: string; member_id: string; name: string; starts_at: Date; ends_at: Date; status: string; action: string;
  replaces_id: string | null; note: string | null; requested_by_name: string | null; created_at: Date;
};

export async function shiftsBetween(from: Date, to: Date) {
  return sql()<Shift[]>`
    select s.id, s.member_id, m.name, s.starts_at, s.ends_at, s.status, s.action, s.replaces_id, s.note, rb.name as requested_by_name, s.created_at
    from read_shifts s join members m on m.id = s.member_id left join members rb on rb.id = s.requested_by
    where s.status in ('approved', 'requested') and s.starts_at < ${to} and s.ends_at > ${from}
    order by s.starts_at, m.name`;
}

export async function onCallNow() {
  return sql()<{ name: string; ends_at: Date }[]>`
    select m.name, s.ends_at from read_shifts s join members m on m.id = s.member_id
    where s.status = 'approved' and s.starts_at <= now() and s.ends_at > now() order by s.ends_at`;
}

export async function readTeam() {
  return sql()<{ id: string; name: string; email: string; username: string; role: string; status: string; read_role: string | null; read_approver: boolean; last_login_at: Date | null }[]>`
    select id, name, email, username, role, status, read_role, read_approver, last_login_at from members
    where read_role is not null or read_approver order by read_approver desc, read_role = 'super' desc, name`;
}

export async function pending() {
  const db = sql();
  const [shifts, adjustments] = await Promise.all([
    db<(Shift & { old_starts: Date | null; old_ends: Date | null })[]>`
      select s.id, s.member_id, m.name, s.starts_at, s.ends_at, s.status, s.action, s.replaces_id, s.note, rb.name as requested_by_name, s.created_at,
        o.starts_at as old_starts, o.ends_at as old_ends
      from read_shifts s join members m on m.id = s.member_id left join members rb on rb.id = s.requested_by left join read_shifts o on o.id = s.replaces_id
      where s.status = 'requested' order by s.created_at`,
    db<{ id: string; member_id: string; name: string; work_date: Date; hours: string; reason: string; requested_by_name: string | null; created_at: Date }[]>`
      select a.id, a.member_id, m.name, a.work_date, a.hours, a.reason, rb.name as requested_by_name, a.created_at
      from read_adjustments a join members m on m.id = a.member_id left join members rb on rb.id = a.requested_by
      where a.status = 'requested' order by a.created_at`,
  ]);
  return { shifts, adjustments };
}

// Hours per person per day from approved shifts and pay card changes, for a date range (Eastern dates).
export type DayHours = { member_id: string; name: string; day: string; scheduled: number; adjusted: number; pending: number; shifts: number };
export async function hoursBetween(fromDate: string, toDate: string, memberId: string | null) {
  return sql()<DayHours[]>`
    with s as (
      select member_id, to_char((starts_at at time zone ${TZ})::date, 'YYYY-MM-DD') as day,
        sum(extract(epoch from (ends_at - starts_at)) / 3600)::float8 as scheduled, count(*)::int as shifts
      from read_shifts where status = 'approved'
        and (starts_at at time zone ${TZ})::date between ${fromDate}::date and ${toDate}::date
        and (${memberId === null} or member_id = ${memberId})
      group by 1, 2
    ),
    a as (
      select member_id, to_char(work_date, 'YYYY-MM-DD') as day,
        coalesce(sum(hours) filter (where status = 'approved'), 0)::float8 as adjusted,
        coalesce(sum(hours) filter (where status = 'requested'), 0)::float8 as pending
      from read_adjustments where work_date between ${fromDate}::date and ${toDate}::date and status in ('approved', 'requested')
        and (${memberId === null} or member_id = ${memberId})
      group by 1, 2
    )
    select coalesce(s.member_id, a.member_id) as member_id, m.name, coalesce(s.day, a.day) as day,
      coalesce(s.scheduled, 0) as scheduled, coalesce(a.adjusted, 0) as adjusted, coalesce(a.pending, 0) as pending, coalesce(s.shifts, 0) as shifts
    from s full join a on a.member_id = s.member_id and a.day = s.day
    join members m on m.id = coalesce(s.member_id, a.member_id)
    order by m.name, 3`;
}

// ---- Eastern time helpers ----
export function etParts(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}
export const todayET = () => etParts(new Date()).date;
export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function mondayOf(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}
export const fmtTime = (d: Date) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
export const fmtDay = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
export const hrs = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
