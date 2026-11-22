import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { emailLayout, esc, sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";
import { linkToken, tagLinks } from "@/lib/visitors";
import { leadName, type LeadRow } from "@/lib/leads";

// Labb lead meetings: weekly hours per Labb team member (Eastern time), 30 minute video calls that
// prospects book from a private link, and the emails around accepting a lead.

export const TZ = "America/New_York";
export const SLOT_MIN = 30;
const NOTICE_HOURS = 4;
const WINDOW_DAYS = 21;
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ---- Time helpers (Eastern) ----
function etOffsetMin(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  return Math.round((asUtc - d.getTime()) / 60000);
}
// Eastern wall-clock date + minutes after midnight -> instant.
export function etToUtc(date: string, min: number) {
  const guess = new Date(`${date}T00:00:00Z`).getTime() + min * 60000;
  const off1 = etOffsetMin(new Date(guess));
  const t = guess - off1 * 60000;
  const off2 = etOffsetMin(new Date(t));
  return new Date(guess - off2 * 60000);
}
export function etDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const fmtWhen = (d: Date) =>
  `${new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: TZ })} at ${new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ })} ET`;
export const fmtClock = (d: Date) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
export const fmtDayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
export const minToClock = (m: number) => {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 || h === 24 ? "AM" : "PM"}`;
};

// ---- Team ----
export type Host = { id: string; name: string; email: string; meeting_url: string | null; hours: number };
export async function meetingHosts(): Promise<Host[]> {
  return sql()<Host[]>`
    select m.id, m.name, m.email, m.meeting_url, (select count(*)::int from meeting_hours h where h.member_id = m.id) as hours
    from members m where m.role = 'admin' and m.status <> 'disabled' order by m.superadmin desc, lower(m.name)`;
}
export type HourRow = { dow: number; start_min: number; end_min: number };
export const hoursFor = (memberId: string) =>
  sql()<HourRow[]>`select dow, start_min, end_min from meeting_hours where member_id = ${memberId} order by dow, start_min`;

// Open 30 minute slots for one host, or for every host with hours when hostId is null.
export async function openSlots(hostId: string | null): Promise<{ start: Date; hostId: string }[]> {
  const db = sql();
  const hours = await db<(HourRow & { member_id: string })[]>`
    select h.member_id, h.dow, h.start_min, h.end_min from meeting_hours h join members m on m.id = h.member_id
    where m.role = 'admin' and m.status <> 'disabled' ${hostId ? db`and h.member_id = ${hostId}` : db``}`;
  if (!hours.length) return [];
  const now = Date.now();
  const busy = await db<{ host_id: string; starts_at: Date; ends_at: Date }[]>`
    select host_id, starts_at, ends_at from lead_meetings where status = 'booked' and ends_at > now()
      and starts_at < now() + ${`${WINDOW_DAYS + 1} days`}::interval`;
  const today = etDate(new Date());
  const out: { start: Date; hostId: string }[] = [];
  for (let i = 0; i <= WINDOW_DAYS; i++) {
    const date = addDays(today, i);
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    for (const h of hours.filter((x) => x.dow === dow)) {
      for (let m = h.start_min; m + SLOT_MIN <= h.end_min; m += SLOT_MIN) {
        const start = etToUtc(date, m);
        if (start.getTime() < now + NOTICE_HOURS * 3600_000) continue;
        const end = start.getTime() + SLOT_MIN * 60000;
        if (busy.some((b) => b.host_id === h.member_id && new Date(b.starts_at).getTime() < end && new Date(b.ends_at).getTime() > start.getTime())) continue;
        out.push({ start, hostId: h.member_id });
      }
    }
  }
  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  if (hostId) return out;
  // "Any available": one entry per start time, given to the host with the fewest upcoming meetings.
  const load = new Map<string, number>();
  for (const b of busy) load.set(b.host_id, (load.get(b.host_id) || 0) + 1);
  const by = new Map<number, { start: Date; hostId: string }>();
  for (const s of out) {
    const cur = by.get(s.start.getTime());
    if (!cur || (load.get(s.hostId) || 0) < (load.get(cur.hostId) || 0)) by.set(s.start.getTime(), s);
  }
  return [...by.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

// ---- Test links: an admin previews the prospect emails and booking page with their own address. ----
// "test-<base64url(adminId.host)>.<sig>". Booking in test mode emails only the admin and saves nothing.
const testSig = (p: string) => createHmac("sha256", process.env.SESSION_SECRET || "dev").update(`meet-test:${p}`).digest("base64url").slice(0, 22);
export function testToken(adminId: string, host: string) {
  const p = Buffer.from(`${adminId}.${host}`).toString("base64url");
  return `test-${p}.${testSig(p)}`;
}
export function readTestToken(t: string): { adminId: string; host: string | null } | null {
  const m = t.match(/^test-([A-Za-z0-9_-]{10,200})\.([A-Za-z0-9_-]{22})$/);
  if (!m) return null;
  const want = Buffer.from(testSig(m[1])), got = Buffer.from(m[2]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const [adminId, host] = Buffer.from(m[1], "base64url").toString("utf8").split(".");
  return adminId ? { adminId, host: host && host !== "any" ? host : null } : null;
}
// A stand-in lead built from the admin's own account, for test emails.
export async function testLead(adminId: string): Promise<(LeadRow & { meeting_host: string | null }) | null> {
  const [a] = await sql()<{ id: string; name: string; email: string }[]>`select id, name, email from members where id = ${adminId} and role = 'admin' and status <> 'disabled'`;
  if (!a) return null;
  const [firstName, ...rest] = a.name.split(" ");
  return { id: "0", type: "meeting-test", segment: "other", email: a.email, first_name: firstName, last_name: rest.join(" ") || null, company: "Labb (test)", phone: null, owner: "labb", status: "new", archived: false, meeting_host: null } as unknown as LeadRow & { meeting_host: string | null };
}

export const newToken = () => randomBytes(18).toString("base64url");
export const roomFor = (host: { meeting_url: string | null }) =>
  host.meeting_url || `https://meet.jit.si/Labb-${randomBytes(9).toString("base64url").replace(/[-_]/g, "x")}`;

// ---- Calendar invite ----
const icsTime = (d: Date) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
export function ics(m: { id: string | number; starts_at: Date; ends_at: Date; room_url: string }, title: string, description: string, organizer: { name: string; email: string }, attendee: string, cancel = false) {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Labb//Lead meetings//EN", "CALSCALE:GREGORIAN", `METHOD:${cancel ? "CANCEL" : "REQUEST"}`,
    "BEGIN:VEVENT", `UID:labb-meeting-${m.id}@labb.com`, `DTSTAMP:${icsTime(new Date())}`, `DTSTART:${icsTime(m.starts_at)}`, `DTEND:${icsTime(m.ends_at)}`,
    `SUMMARY:${icsText(title)}`, `DESCRIPTION:${icsText(description)}`, `LOCATION:${icsText(m.room_url)}`, `URL:${m.room_url}`,
    `ORGANIZER;CN=${icsText(organizer.name)}:mailto:${organizer.email}`, `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:${attendee}`,
    `STATUS:${cancel ? "CANCELLED" : "CONFIRMED"}`, `SEQUENCE:${cancel ? 1 : 0}`,
    "BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", "DESCRIPTION:Labb meeting", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return Buffer.from(lines.join("\r\n"));
}

const first = (l: LeadRow) => esc(l.first_name || "there");
const footer = "Ramsey Diagnostics Corporation d/b/a Labb, 2115 Granby Street, Norfolk, VA 23517, info@labb.com";

// ---- Emails to the prospect ----

// CPP member accepted the lead: Labb tells the prospect to watch for the partner's email.
export async function emailPartnerIntro(lead: LeadRow, partner: { name: string; email: string; clinic: string | null }) {
  const who = partner.clinic || partner.name;
  const html = emailLayout(
    `${esc(who)} will be contacting you`,
    `<p>Hi ${first(lead)},</p>
     <p>Thank you for your interest in Labb. We've connected you with <strong>${esc(who)}</strong>, an authorized Labb partner who serves your area. They will be reaching out shortly to learn about your needs and walk you through your options.</p>
     <p><strong>Please be on the lookout for an email from ${esc(partner.name)}${partner.clinic ? ` at ${esc(partner.clinic)}` : ""} (${esc(partner.email)}).</strong> If you don't see it within one business day, check your spam or promotions folder, or simply reply to this email and it will reach them.</p>
     <p>Thank you,<br>The Labb team</p>`,
  );
  const text = `Hi ${lead.first_name || "there"},\n\nThank you for your interest in Labb. We've connected you with ${who}, an authorized Labb partner who serves your area. They will be reaching out shortly to learn about your needs and walk you through your options.\n\nPlease be on the lookout for an email from ${partner.name}${partner.clinic ? ` at ${partner.clinic}` : ""} (${partner.email}). If you don't see it within one business day, check your spam or promotions folder, or reply to this email and it will reach them.\n\nThank you,\nThe Labb team\n\n${footer}`;
  return sendMail(lead.email, `${who}, a Labb partner, will be contacting you`, tagLinks(html, linkToken(lead.email)), text, { replyTo: partner.email });
}

// Labb kept the lead: invite the prospect to book a call.
export async function emailBookingInvite(lead: LeadRow, host: { name: string; email: string } | null, token: string, test = false) {
  const link = absoluteUrl(`/meet/${token}`);
  const welcome = absoluteUrl("/welcome");
  const who = host ? `${esc(host.name.split(" ")[0])} from our team` : "Someone from our team";
  const html = emailLayout(
    "Let's schedule a call",
    `<p>Hi ${first(lead)},</p>
     <p>Thank you for your interest in Labb. ${who} would like to schedule a short video call with you to go over all of Labb's programs and find the right fit for your organization.</p>
     <p>Choose a time that works for you. It takes less than a minute, and you'll get a video meeting link as soon as you book.</p>`,
    { href: link, label: "Choose a meeting time" },
  ).replace(/(<p style="font-size:12px;color:#5f6a74;border-top)/, `<p>Before we talk, take a look at everything Labb offers: <a href="${welcome}" style="color:#CF743C;font-weight:bold">labb.com/welcome</a></p>\n  $1`);
  const text = `Hi ${lead.first_name || "there"},\n\nThank you for your interest in Labb. ${host ? `${host.name.split(" ")[0]} from our team` : "Someone from our team"} would like to schedule a short video call with you to go over all of Labb's programs and find the right fit for your organization.\n\nChoose a time that works for you: ${link}\n\nYou'll get a video meeting link as soon as you book.\n\nBefore we talk, take a look at everything Labb offers: ${welcome}\n\nThe Labb team\n\n${footer}`;
  return sendMail(lead.email, `${test ? "[Test] " : ""}Schedule a call with Labb`, tagLinks(html, linkToken(lead.email)), text, { replyTo: host?.email || "info@labb.com" });
}

type Mtg = { id: string; starts_at: Date; ends_at: Date; room_url: string };

export async function emailBooked(lead: LeadRow, m: Mtg, host: { name: string; email: string }, token: string, test = false) {
  const when = fmtWhen(m.starts_at);
  const manage = absoluteUrl(`/meet/${token}`);
  const invite = ics(m, "Call with Labb", `Video meeting: ${m.room_url}\nWith ${host.name}, Labb.\nNeed to change the time? ${manage}`, { name: `${host.name}, Labb`, email: host.email }, lead.email);
  const html = emailLayout(
    "Your call with Labb is confirmed",
    `<p>Hi ${first(lead)},</p>
     <p>You're booked for a ${SLOT_MIN} minute video call with <strong>${esc(host.name)}</strong> from Labb.</p>
     <p style="font-size:17px"><strong>${esc(when)}</strong></p>
     <p>At the scheduled time, use the button below to join the video meeting from your computer or phone. No download is required for most browsers. A calendar invite is attached.</p>
     <p style="font-size:13px">Meeting link: <a href="${esc(m.room_url)}" style="color:#CF743C">${esc(m.room_url)}</a><br>Need a different time? <a href="${manage}" style="color:#CF743C">Reschedule or cancel</a>.</p>`,
    { href: m.room_url, label: "Join the video meeting" },
  );
  const text = `Hi ${lead.first_name || "there"},\n\nYou're booked for a ${SLOT_MIN} minute video call with ${host.name} from Labb.\n\n${when}\n\nJoin the video meeting: ${m.room_url}\n\nNeed a different time? ${manage}\n\nThe Labb team\n\n${footer}`;
  return sendMail(lead.email, `${test ? "[Test] " : ""}Confirmed: your call with Labb, ${when}`, html, text, {
    replyTo: host.email, attachments: [{ filename: "labb-meeting.ics", content: invite, type: "text/calendar; method=REQUEST" }],
  });
}

export async function emailHostBooked(lead: LeadRow, m: Mtg, host: { name: string; email: string }, notes: string | null) {
  const when = fmtWhen(m.starts_at);
  const rec = absoluteUrl(`/admin/leads/${lead.id}`);
  const invite = ics(m, `Labb call: ${leadName(lead)}`, `Video meeting: ${m.room_url}\nLead: ${rec}`, { name: "Labb", email: "info@labb.com" }, host.email);
  const html = emailLayout(
    "New meeting booked",
    `<p>${esc(leadName(lead))}${lead.company ? `, ${esc(lead.company)}` : ""} booked a call with you.</p>
     <p style="font-size:17px"><strong>${esc(when)}</strong></p>
     <p>${esc(lead.email)}${lead.phone ? ` · ${esc(lead.phone)}` : ""}</p>
     ${notes ? `<p><strong>Their note:</strong> ${esc(notes)}</p>` : ""}
     <p>Video meeting: <a href="${esc(m.room_url)}" style="color:#CF743C">${esc(m.room_url)}</a></p>`,
    { href: rec, label: "Open the lead" },
  );
  const text = `${leadName(lead)}${lead.company ? `, ${lead.company}` : ""} booked a call with you.\n\n${when}\n${lead.email}${lead.phone ? ` · ${lead.phone}` : ""}\n${notes ? `Their note: ${notes}\n` : ""}\nVideo meeting: ${m.room_url}\nLead: ${rec}`;
  return sendMail(host.email, `Meeting booked: ${leadName(lead)}, ${when}`, html, text, {
    replyTo: lead.email, attachments: [{ filename: "labb-meeting.ics", content: invite, type: "text/calendar; method=REQUEST" }],
  });
}

export async function emailCancelled(lead: LeadRow, m: Mtg, host: { name: string; email: string }, byProspect: boolean, token: string | null) {
  const when = fmtWhen(m.starts_at);
  const cancelIcs = (to: string) => ics(m, "Call with Labb", "Cancelled", { name: `${host.name}, Labb`, email: host.email }, to, true);
  if (byProspect) {
    await sendMail(host.email, `Meeting cancelled: ${leadName(lead)}, ${when}`,
      emailLayout("Meeting cancelled", `<p>${esc(leadName(lead))} cancelled the call set for ${esc(when)}.</p>`, { href: absoluteUrl(`/admin/leads/${lead.id}`), label: "Open the lead" }),
      `${leadName(lead)} cancelled the call set for ${when}.`, { attachments: [{ filename: "labb-meeting.ics", content: cancelIcs(host.email), type: "text/calendar; method=CANCEL" }] });
  } else {
    const link = token ? absoluteUrl(`/meet/${token}`) : null;
    await sendMail(lead.email, `Cancelled: your call with Labb, ${when}`,
      emailLayout("Your call has been cancelled", `<p>Hi ${first(lead)},</p><p>Your call with Labb set for ${esc(when)} has been cancelled. We're sorry for the change.${link ? " Please choose another time that works for you." : ""}</p>`, link ? { href: link, label: "Choose a new time" } : undefined),
      `Hi ${lead.first_name || "there"},\n\nYour call with Labb set for ${when} has been cancelled.${link ? ` Choose another time: ${link}` : ""}\n\n${footer}`,
      { replyTo: host.email, attachments: [{ filename: "labb-meeting.ics", content: cancelIcs(lead.email), type: "text/calendar; method=CANCEL" }] });
  }
}

// ---- Jobs: reminder with the meeting link about an hour before ----
export async function runMeetingJobs() {
  try {
    const db = sql();
    const due = await db<(Mtg & { lead_id: string; host_name: string; host_email: string })[]>`
      select g.id, g.starts_at, g.ends_at, g.room_url, g.lead_id, m.name as host_name, m.email as host_email
      from lead_meetings g join members m on m.id = g.host_id
      where g.status = 'booked' and not g.reminded and g.starts_at > now() and g.starts_at <= now() + interval '65 minutes'`;
    for (const g of due) {
      const claimed = await db`update lead_meetings set reminded = true where id = ${g.id} and not reminded returning id`;
      if (!claimed.length) continue;
      const [lead] = await db<LeadRow[]>`select * from leads where id = ${g.lead_id}`;
      if (!lead) continue;
      const when = fmtClock(g.starts_at) + " ET";
      await sendMail(lead.email, `Reminder: your call with Labb at ${when}`,
        emailLayout("Your call with Labb starts soon", `<p>Hi ${first(lead)},</p><p>This is a reminder that your video call with ${esc(g.host_name)} from Labb starts at <strong>${esc(when)}</strong>.</p>`, { href: g.room_url, label: "Join the video meeting" }),
        `Hi ${lead.first_name || "there"},\n\nYour video call with ${g.host_name} from Labb starts at ${when}.\n\nJoin: ${g.room_url}\n\n${footer}`, { replyTo: g.host_email });
      await sendMail(g.host_email, `Reminder: call with ${leadName(lead)} at ${when}`,
        emailLayout("Meeting starts soon", `<p>Your call with ${esc(leadName(lead))}${lead.company ? `, ${esc(lead.company)}` : ""} starts at <strong>${esc(when)}</strong>.</p><p><a href="${absoluteUrl(`/admin/leads/${lead.id}`)}" style="color:#CF743C">Open the lead</a></p>`, { href: g.room_url, label: "Join the video meeting" }),
        `Your call with ${leadName(lead)} starts at ${when}. Join: ${g.room_url}`);
    }
  } catch (e) {
    console.error("[meetings] job failed", e);
  }
}

