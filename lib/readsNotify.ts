import "server-only";
import { sql } from "@/lib/db";
import { emailLayout, esc, sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";
import { easternToDate } from "@/lib/imageSize";
import { addDays, etParts, fmtDay, fmtTime, todayET } from "@/lib/reads";

// Emails for the reads schedule, and the minute-by-minute job behind reminders and night coverage.

export const NIGHT_START = "21:00";
export const NIGHT_END = "07:00";
const link = (path = "/reads") => absoluteUrl(path);

async function approvers() {
  return sql()<{ id: string; name: string; email: string }[]>`select id, name, email from members where read_approver and status <> 'disabled' order by name`;
}

// Tell the approver about any request from a read admin.
export async function notifyApprover(subject: string, lines: string[]) {
  for (const a of await approvers()) {
    await sendMail(a.email, subject,
      emailLayout(subject, lines.map((l) => `<p>${esc(l)}</p>`).join(""), { href: link("/reads/approvals"), label: "Review requests" }),
      `${lines.join("\n")}\n\nReview requests: ${link("/reads/approvals")}`,
    ).catch((e) => console.error("[reads] approver email", e));
  }
}

export async function emailMember(memberId: string, subject: string, lines: string[], cta = { href: link(), label: "Open the schedule" }) {
  const [m] = await sql()<{ email: string; name: string }[]>`select email, name from members where id = ${memberId} and status <> 'disabled'`;
  if (!m) return false;
  return sendMail(m.email, subject,
    emailLayout(subject, `<p>Hi ${esc(m.name.split(" ")[0])},</p>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}`, cta),
    `Hi ${m.name.split(" ")[0]},\n\n${lines.join("\n")}\n\n${cta.label}: ${cta.href}`,
  ).catch((e) => { console.error("[reads] member email", e); return false; });
}

export const shiftText = (s: Date, e: Date) => `${fmtDay(etParts(new Date(s)).date)}, ${fmtTime(s)} to ${fmtTime(e)} ET`;

// ---- The job: runs every minute in the web server (instrumentation.ts) ----
let lastNight = 0;
let running = false;
export async function runReadsJobs() {
  if (running) return;
  running = true;
  try {
    if (Date.now() - lastNight > 3600_000) { lastNight = Date.now(); await ensureNights(); }
    await sendReminders();
    await sendDaily();
  } catch (e) {
    console.error("[reads] job failed", e);
  } finally {
    running = false;
  }
}

// Default night coverage: the approver, 9 PM to 7 AM, every night for the next year.
async function ensureNights() {
  const [owner] = await sql()<{ id: string }[]>`
    select id from members where read_approver and status <> 'disabled' order by (lower(name) like 'angela%') desc, created_at limit 1`;
  if (!owner) return;
  const db = sql();
  const today = todayET();
  const have = new Set((await db<{ day: string }[]>`select to_char(day, 'YYYY-MM-DD') as day from read_night_days where day >= ${today}::date`).map((r) => r.day));
  for (let i = 0; i <= 365; i++) {
    const d = addDays(today, i);
    if (have.has(d)) continue;
    const s = easternToDate(`${d}T${NIGHT_START}`)!;
    const e = easternToDate(`${addDays(d, 1)}T${NIGHT_END}`)!;
    await db.begin(async (tx) => {
      const [ins] = await tx`insert into read_night_days (day) values (${d}) on conflict do nothing returning day`;
      if (ins) await tx`insert into read_shifts (member_id, starts_at, ends_at, status, action, auto_night, note, requested_by, decided_by, decided_at)
        values (${owner.id}, ${s}, ${e}, 'approved', 'add', true, 'Night hours', ${owner.id}, ${owner.id}, now())`;
    });
  }
}

// 60, 30 and 5 minutes before each approved shift. Default night coverage doesn't send reminders.
async function sendReminders() {
  const db = sql();
  const soon = await db<{ id: string; member_id: string; starts_at: Date; ends_at: Date }[]>`
    select id, member_id, starts_at, ends_at from read_shifts
    where status = 'approved' and not auto_night and starts_at > now() and starts_at <= now() + interval '61 minutes'`;
  const now = Date.now();
  for (const s of soon) {
    const mins = (new Date(s.starts_at).getTime() - now) / 60_000;
    const kind = mins <= 5 ? "5" : mins <= 30 ? "30" : mins <= 60 ? "60" : null;
    if (!kind) continue;
    const [fresh] = await db`insert into read_notifications (shift_id, kind) values (${s.id}, ${kind}) on conflict do nothing returning kind`;
    if (!fresh) continue;
    const left = Math.max(1, Math.round(mins));
    await emailMember(s.member_id, `Reads start in ${left} minute${left === 1 ? "" : "s"}`,
      [`Your read shift starts in ${left} minute${left === 1 ? "" : "s"}: ${shiftText(s.starts_at, s.ends_at)}.`]);
  }
}

// 7 AM Eastern: each read admin scheduled today gets the day's shifts.
async function sendDaily() {
  const { date, time } = etParts(new Date());
  if (time < "07:00" || time >= "12:00") return;
  const db = sql();
  const rows = await db<{ member_id: string; starts_at: Date; ends_at: Date }[]>`
    select member_id, starts_at, ends_at from read_shifts
    where status = 'approved' and not auto_night and (starts_at at time zone 'America/New_York')::date = ${date}::date
      and not exists (select 1 from read_daily_emails d where d.member_id = read_shifts.member_id and d.day = ${date}::date)
    order by starts_at`;
  type R = { member_id: string; starts_at: Date; ends_at: Date };
  const byMember = new Map<string, R[]>();
  for (const r of rows as R[]) byMember.set(r.member_id, [...(byMember.get(r.member_id) || []), r]);
  for (const [id, list] of byMember) {
    const [fresh] = await db`insert into read_daily_emails (member_id, day) values (${id}, ${date}::date) on conflict do nothing returning day`;
    if (!fresh) continue;
    await emailMember(id, `You're on the reads schedule today`,
      [`You're scheduled for reads today, ${fmtDay(date)}:`, ...list.map((r) => `${fmtTime(r.starts_at)} to ${fmtTime(r.ends_at)} ET`), "You'll also get reminders 1 hour, 30 minutes and 5 minutes before each shift."]);
  }
}
