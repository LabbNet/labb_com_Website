import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { emailLayout, esc, sendMail } from "@/lib/mail";
import { cancelTeamsMeeting, createTeamsMeeting, graphOn, moveTeamsMeeting } from "@/lib/msgraph";
import { absoluteUrl } from "@/lib/site";
import { linkToken, tagLinks } from "@/lib/visitors";
import { leadName, logLeadEvent, type LeadRow } from "@/lib/leads";

// Labb lead meetings: weekly hours per Labb team member (Eastern time), 30 minute video calls that
// prospects book from a private link, and the emails around accepting a lead.

export const TZ = "America/New_York";
export const SLOT_MIN = 30;
// Prospects book no sooner than the day after the next two business days (today and the next two business days are closed).
export const BUSINESS_DAYS_CLOSED = 2;
export const BUFFER_MIN = 15; // kept free before and after every meeting and Outlook appointment
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

// Today plus the next two business days are closed; the first bookable day is the one after.
export function firstBookableDate(today: string) {
  let d = today;
  let n = 0;
  while (n < BUSINESS_DAYS_CLOSED) {
    d = addDays(d, 1);
    const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return addDays(d, 1);
}

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
  // Outlook busy times (see lib/calsync.ts).
  const outlook = await db<{ host_id: string; starts_at: Date; ends_at: Date }[]>`
    select host_id, starts_at, ends_at from host_busy where ends_at > now() and starts_at < now() + ${`${WINDOW_DAYS + 1} days`}::interval`.catch(() => []);
  const blocks = [...busy, ...outlook].map((b) => ({ host: b.host_id, s: new Date(b.starts_at).getTime() - BUFFER_MIN * 60000, e: new Date(b.ends_at).getTime() + BUFFER_MIN * 60000 }));
  const today = etDate(new Date());
  const first = firstBookableDate(today);
  const out: { start: Date; hostId: string }[] = [];
  for (let i = 0; i <= WINDOW_DAYS; i++) {
    const date = addDays(today, i);
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    for (const h of hours.filter((x) => x.dow === dow)) {
      for (let m = h.start_min; m + SLOT_MIN <= h.end_min; m += SLOT_MIN) {
        const start = etToUtc(date, m);
        if (date < first || start.getTime() < now) continue;
        const end = start.getTime() + SLOT_MIN * 60000;
        if (blocks.some((b) => b.host === h.member_id && b.s < end && b.e > start.getTime())) continue;
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
// The host's own Microsoft Teams link, until a Teams meeting is created for this meeting (see attachTeams).
export const roomFor = (host: { meeting_url: string | null }) => host.meeting_url || "";

// Join button and link lines for emails. A meeting can briefly have no link if Microsoft 365 isn't connected.
const joinCta = (url: string) => (url ? { href: url, label: /teams\.(microsoft|live)\.com/i.test(url) ? "Join the Microsoft Teams meeting" : "Join the video meeting" } : undefined);
const joinLine = (url: string) => (url ? `Meeting link: <a href="${esc(url)}" style="color:#CF743C">${esc(url)}</a>` : "Your Microsoft Teams link will be emailed before the meeting.");
const joinText = (url: string) => (url ? `Join: ${url}` : "Your Microsoft Teams link will be emailed before the meeting.");

// With Microsoft 365 connected: create a Teams meeting in the host's Outlook calendar. Outlook sends the
// invitation to the prospect, and the meeting is saved with its Teams link.
export async function attachTeams(m: { id: string | number; starts_at: Date; ends_at: Date; room_url: string }, host: { email: string }, lead: LeadRow, subject: string, html: string): Promise<boolean> {
  if (!graphOn() || String(m.id).startsWith("test")) return false;
  try {
    const r = await createTeamsMeeting(host.email, { subject, start: m.starts_at, end: m.ends_at, html, attendee: { email: lead.email, name: leadName(lead) } });
    m.room_url = r.joinUrl || m.room_url;
    await sql()`update lead_meetings set graph_event_id = ${r.eventId}, graph_mailbox = ${host.email}, room_url = ${m.room_url} where id = ${m.id}`;
    return true;
  } catch (e) {
    console.error("[teams] create failed", e instanceof Error ? e.message : e);
    return false;
  }
}

// Cancel the Outlook/Teams meeting behind a Labb meeting, if there is one. Outlook tells the prospect.
export async function cancelTeams(meetingId: string | number, comment = "This meeting has been cancelled.") {
  const [g] = await sql()<{ graph_event_id: string | null; graph_mailbox: string | null }[]>`select graph_event_id, graph_mailbox from lead_meetings where id = ${meetingId}`.catch(() => []);
  if (!g?.graph_event_id || !g.graph_mailbox || !graphOn()) return false;
  try { await cancelTeamsMeeting(g.graph_mailbox, g.graph_event_id, comment); return true; } catch (e) { console.error("[teams] cancel failed", e instanceof Error ? e.message : e); return false; }
}

// ---- Calendar invite ----
const icsTime = (d: Date) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
export function ics(m: { id: string | number; starts_at: Date; ends_at: Date; room_url: string }, title: string, description: string, organizer: { name: string; email: string }, attendee: string, cancel = false, seq?: number) {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Labb//Lead meetings//EN", "CALSCALE:GREGORIAN", `METHOD:${cancel ? "CANCEL" : "REQUEST"}`,
    "BEGIN:VEVENT", `UID:labb-meeting-${m.id}@labb.com`, `DTSTAMP:${icsTime(new Date())}`, `DTSTART:${icsTime(m.starts_at)}`, `DTEND:${icsTime(m.ends_at)}`,
    `SUMMARY:${icsText(title)}`, `DESCRIPTION:${icsText(description)}`, `LOCATION:${icsText(m.room_url)}`, `URL:${m.room_url}`,
    `ORGANIZER;CN=${icsText(organizer.name)}:mailto:${organizer.email}`, `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:${attendee}`,
    `STATUS:${cancel ? "CANCELLED" : "CONFIRMED"}`, `SEQUENCE:${seq ?? (cancel ? 1 : 0)}`,
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

export async function emailBooked(lead: LeadRow, m: Mtg, host: { name: string; email: string }, token: string, test = false, outlook = false) {
  const when = fmtWhen(m.starts_at);
  const manage = absoluteUrl(`/meet/${token}`);
  const invite = ics(m, "Call with Labb", `Video meeting: ${m.room_url}\nWith ${host.name}, Labb.\nNeed to change the time? ${manage}`, { name: `${host.name}, Labb`, email: host.email }, lead.email);
  const html = emailLayout(
    "Your call with Labb is confirmed",
    `<p>Hi ${first(lead)},</p>
     <p>You're booked for a ${SLOT_MIN} minute video call with <strong>${esc(host.name)}</strong> from Labb.</p>
     <p style="font-size:17px"><strong>${esc(when)}</strong></p>
     <p>At the scheduled time, use the button below to join the Microsoft Teams meeting from your computer or phone. You can join from a web browser; no download is needed. ${outlook ? `A calendar invitation from ${esc(host.name)} is on its way separately.` : "A calendar invite is attached."}</p>
     <p style="font-size:13px">${joinLine(m.room_url)}<br>Need a different time? <a href="${manage}" style="color:#CF743C">Reschedule or cancel</a>.</p>`,
    joinCta(m.room_url),
  );
  const text = `Hi ${lead.first_name || "there"},\n\nYou're booked for a ${SLOT_MIN} minute video call with ${host.name} from Labb.\n\n${when}\n\n${joinText(m.room_url)}\n\nNeed a different time? ${manage}\n\nThe Labb team\n\n${footer}`;
  return sendMail(lead.email, `${test ? "[Test] " : ""}Confirmed: your call with Labb, ${when}`, html, text, {
    replyTo: host.email, attachments: outlook ? [] : [{ filename: "labb-meeting.ics", content: invite, type: "text/calendar; method=REQUEST" }],
  });
}

export async function emailHostBooked(lead: LeadRow, m: Mtg, host: { name: string; email: string }, notes: string | null, outlook = false) {
  const when = fmtWhen(m.starts_at);
  const rec = absoluteUrl(`/admin/leads/${lead.id}`);
  const invite = ics(m, `Labb call: ${leadName(lead)}`, `Video meeting: ${m.room_url}\nLead: ${rec}`, { name: "Labb", email: "info@labb.com" }, host.email);
  const html = emailLayout(
    "New meeting booked",
    `<p>${esc(leadName(lead))}${lead.company ? `, ${esc(lead.company)}` : ""} booked a call with you.</p>
     <p style="font-size:17px"><strong>${esc(when)}</strong></p>
     <p>${esc(lead.email)}${lead.phone ? ` · ${esc(lead.phone)}` : ""}</p>
     ${notes ? `<p><strong>Their note:</strong> ${esc(notes)}</p>` : ""}
     <p>${outlook ? "The Teams meeting is on your Outlook calendar. " : ""}${joinLine(m.room_url)}</p>`,
    { href: rec, label: "Open the lead" },
  );
  const text = `${leadName(lead)}${lead.company ? `, ${lead.company}` : ""} booked a call with you.\n\n${when}\n${lead.email}${lead.phone ? ` · ${lead.phone}` : ""}\n${notes ? `Their note: ${notes}\n` : ""}\nVideo meeting: ${m.room_url}\nLead: ${rec}`;
  return sendMail(host.email, `Meeting booked: ${leadName(lead)}, ${when}`, html, text, {
    replyTo: lead.email, attachments: outlook ? [] : [{ filename: "labb-meeting.ics", content: invite, type: "text/calendar; method=REQUEST" }],
  });
}

export async function emailCancelled(lead: LeadRow, m: Mtg, host: { name: string; email: string }, byProspect: boolean, token: string | null) {
  const when = fmtWhen(m.starts_at);
  // A Teams meeting in Outlook: cancelling it there updates both calendars, so no calendar file is attached.
  const outlook = await cancelTeams(m.id, byProspect ? "The prospect cancelled this meeting." : "This meeting has been cancelled.");
  const cancelIcs = (to: string) => ics(m, "Call with Labb", "Cancelled", { name: `${host.name}, Labb`, email: host.email }, to, true, Math.floor(Date.now() / 1000) - 1_700_000_000);
  if (byProspect) {
    await sendMail(host.email, `Meeting cancelled: ${leadName(lead)}, ${when}`,
      emailLayout("Meeting cancelled", `<p>${esc(leadName(lead))} cancelled the call set for ${esc(when)}.</p>`, { href: absoluteUrl(`/admin/leads/${lead.id}`), label: "Open the lead" }),
      `${leadName(lead)} cancelled the call set for ${when}.`, { attachments: outlook ? [] : [{ filename: "labb-meeting.ics", content: cancelIcs(host.email), type: "text/calendar; method=CANCEL" }] });
  } else {
    const link = token ? absoluteUrl(`/meet/${token}`) : null;
    await sendMail(lead.email, `Cancelled: your call with Labb, ${when}`,
      emailLayout("Your call has been cancelled", `<p>Hi ${first(lead)},</p><p>Your call with Labb set for ${esc(when)} has been cancelled. We're sorry for the change.${link ? " Please choose another time that works for you." : ""}</p>`, link ? { href: link, label: "Choose a new time" } : undefined),
      `Hi ${lead.first_name || "there"},\n\nYour call with Labb set for ${when} has been cancelled.${link ? ` Choose another time: ${link}` : ""}\n\n${footer}`,
      { replyTo: host.email, attachments: outlook ? [] : [{ filename: "labb-meeting.ics", content: cancelIcs(lead.email), type: "text/calendar; method=CANCEL" }] });
  }
}

// Book (or reschedule) a call for a lead from a slot the prospect picked. Emails both sides and logs it.
export async function bookMeeting(lead: LeadRow, token: string, startIso: string, notes: string | null, phone: string): Promise<"booked" | "taken" | "pick"> {
  const db = sql();
  const start = new Date(startIso);
  if (!startIso || Number.isNaN(start.getTime())) return "pick";
  const slot = (await openSlots(lead.meeting_host || null)).find((s) => s.start.getTime() === start.getTime());
  if (!slot) return "taken";
  const [host] = await db<{ id: string; name: string; email: string; meeting_url: string | null }[]>`select id, name, email, meeting_url from members where id = ${slot.hostId}`;
  const end = new Date(start.getTime() + SLOT_MIN * 60000);
  const [old] = await db<(Mtg & { host_name: string; host_email: string })[]>`
    select g.id, g.starts_at, g.ends_at, g.room_url, m.name as host_name, m.email as host_email
    from lead_meetings g join members m on m.id = g.host_id
    where g.lead_id = ${lead.id} and g.status = 'booked' and g.ends_at > now() order by g.starts_at limit 1`;
  let mt: Mtg;
  try {
    [mt] = await db<Mtg[]>`
      insert into lead_meetings (lead_id, host_id, starts_at, ends_at, room_url, notes, kind)
      values (${lead.id}, ${host.id}, ${start}, ${end}, ${roomFor(host)}, ${notes}, ${await nextKind(String(lead.id))}) returning id, starts_at, ends_at, room_url`;
  } catch {
    return "taken";
  }
  if (old) {
    await db`update lead_meetings set status = 'cancelled' where id = ${old.id}`;
    await emailCancelled(lead, old, { name: old.host_name, email: old.host_email }, true, null);
  }
  if (phone && phone !== lead.phone) await db`update leads set phone = ${phone}, updated_at = now() where id = ${lead.id}`;
  await db`update leads set status = case when status in ('new', 'contacted') then 'qualified' else status end, updated_at = now() where id = ${lead.id}`;
  const fresh = { ...lead, phone: phone || lead.phone };
  const outlook = await attachTeams(mt, host, fresh, `Labb: call with ${host.name}`,
    `<p>Video call with ${esc(host.name)} from Labb.</p>${notes ? `<p>Note: ${esc(notes)}</p>` : ""}<p>Need a different time? <a href="${absoluteUrl(`/meet/${token}`)}">Reschedule or cancel</a>.</p>`);
  const sent = await emailBooked(fresh, mt, host, token, false, outlook);
  await emailHostBooked(fresh, mt, host, notes, outlook);
  await logLeadEvent(lead.id, "meeting", `${old ? "Rescheduled to" : "Booked"} ${fmtWhen(mt.starts_at)} with ${host.name}${sent ? "; confirmation and video link emailed" : "; confirmation email did not send"}${notes ? `. Note: ${notes}` : ""}`, null);
  return "booked";
}

// "/schedule/james" -> that team member; "/schedule" -> anyone available.
export async function hostBySlug(slug: string) {
  const hosts = await meetingHosts();
  return hosts.find((h) => h.name.split(" ")[0].toLowerCase() === slug.toLowerCase()) ?? null;
}
export const hostSlug = (name: string) => name.split(" ")[0].toLowerCase();

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
        emailLayout("Your call with Labb starts soon", `<p>Hi ${first(lead)},</p><p>This is a reminder that your video call with ${esc(g.host_name)} from Labb starts at <strong>${esc(when)}</strong>.</p>`, joinCta(g.room_url)),
        `Hi ${lead.first_name || "there"},\n\nYour video call with ${g.host_name} from Labb starts at ${when}.\n\n${joinText(g.room_url)}\n\n${footer}`, { replyTo: g.host_email });
      await sendMail(g.host_email, `Reminder: call with ${leadName(lead)} at ${when}`,
        emailLayout("Meeting starts soon", `<p>Your call with ${esc(leadName(lead))}${lead.company ? `, ${esc(lead.company)}` : ""} starts at <strong>${esc(when)}</strong>.</p><p><a href="${absoluteUrl(`/admin/leads/${lead.id}`)}" style="color:#CF743C">Open the lead</a></p>`, joinCta(g.room_url)),
        `Your call with ${leadName(lead)} starts at ${when}. ${joinText(g.room_url)}`);
    }
  } catch (e) {
    console.error("[meetings] job failed", e);
  }
}


// ---- Sales meetings: 1 initial discussion, 2 demo, 3 close (proposal and quote review) ----
export const MEETING_KINDS = [
  { value: "discussion", step: 1, label: "Initial discussion", title: "Initial discussion with Labb", minutes: 30,
    blurb: "An introductory call to learn about your testing program and talk through how Labb can help." },
  { value: "demo", step: 2, label: "Demo", title: "Labb demo", minutes: 45,
    blurb: "A live demonstration of Labb for you and your team. Invite anyone who should see it; forward this invite to them." },
  { value: "close", step: 3, label: "Close: quote review", title: "Labb proposal and quote review", minutes: 30,
    blurb: "We'll go over your proposal and pricing, answer final questions and talk through next steps to get started." },
] as const;
export type MeetingKind = (typeof MEETING_KINDS)[number]["value"];
export const isKind = (k: string): k is MeetingKind => MEETING_KINDS.some((x) => x.value === k);
export const kindInfo = (k: string) => MEETING_KINDS.find((x) => x.value === k) ?? MEETING_KINDS[0];
export const MEETING_STATUS: Record<string, string> = { booked: "Scheduled", completed: "Completed", "no-show": "No-show", cancelled: "Cancelled" };

// The next step for a lead: after the last completed (or scheduled) step.
export async function nextKind(leadId: string): Promise<MeetingKind> {
  const rows = await sql()<{ kind: string }[]>`select kind from lead_meetings where lead_id = ${leadId} and status in ('completed', 'booked')`;
  const done = Math.max(0, ...rows.map((r) => kindInfo(r.kind).step));
  return MEETING_KINDS[Math.min(done, 2)].value;
}

type Host2 = { id: string; name: string; email: string; meeting_url: string | null };
type SalesMtg = Mtg & { kind: string; agenda: string | null };
const seqNow = () => Math.floor(Date.now() / 1000) - 1_700_000_000;

function inviteEmail(lead: LeadRow, m: SalesMtg, host: Host2, updated: boolean, outlook: boolean) {
  const k = kindInfo(m.kind);
  const when = fmtWhen(m.starts_at);
  const mins = Math.round((new Date(m.ends_at).getTime() - new Date(m.starts_at).getTime()) / 60000);
  const html = emailLayout(
    updated ? `Updated: ${k.title}` : k.title,
    `<p>Hi ${first(lead)},</p>
     <p>${updated ? "The time for our meeting has changed. Here are the new details." : `${esc(host.name)} from Labb has scheduled a ${mins} minute video meeting with you.`}</p>
     <p style="font-size:17px;margin:14px 0 4px"><strong>${esc(when)}</strong></p>
     <p style="margin-top:0">${esc(k.title)} with ${esc(host.name)}</p>
     <p>${esc(k.blurb)}</p>
     ${m.agenda ? `<p><strong>Agenda:</strong><br>${esc(m.agenda).replace(/\n/g, "<br>")}</p>` : ""}
     <p>${outlook ? `${updated ? "An updated" : "A"} calendar invitation from ${esc(host.name)} is on its way separately.` : "A calendar invite is attached."} At the meeting time, use the button below to join from your computer or phone.</p>
     <p style="font-size:13px">${joinLine(m.room_url)}<br>Need a different time? Just reply to this email.</p>`,
    joinCta(m.room_url),
  );
  const text = `Hi ${lead.first_name || "there"},\n\n${updated ? "The time for our meeting has changed." : `${host.name} from Labb has scheduled a ${mins} minute video meeting with you.`}\n\n${k.title}\n${when}\n\n${k.blurb}\n${m.agenda ? `\nAgenda:\n${m.agenda}\n` : ""}\n${joinText(m.room_url)}\n\nNeed a different time? Reply to this email.\n\n${host.name}\nLabb\n\n${footer}`;
  return { html, text, subject: `${updated ? "Updated invitation" : "Invitation"}: ${k.title}, ${when}` };
}

// Admin schedules (or reschedules) a sales meeting: saves it, emails the prospect and the host a calendar invite, logs it.
export async function scheduleSalesMeeting(lead: LeadRow, o: { kind: MeetingKind; start: Date; minutes: number; hostId: string; room?: string; agenda?: string; by: { id: string; name: string }; replace?: string }) {
  const db = sql();
  const [host] = await db<Host2[]>`select id, name, email, meeting_url from members where id = ${o.hostId} and role = 'admin'`;
  if (!host) throw new Error("Choose who the meeting is with.");
  const end = new Date(o.start.getTime() + o.minutes * 60000);
  const room = o.room && /^https:\/\/\S+$/.test(o.room) ? o.room : roomFor(host);
  let m: SalesMtg | undefined;
  let updated = false;
  const [prev] = o.replace && /^\d+$/.test(o.replace)
    ? await db<{ graph_event_id: string | null; graph_mailbox: string | null }[]>`select graph_event_id, graph_mailbox from lead_meetings where id = ${o.replace} and lead_id = ${lead.id} and status = 'booked'`
    : [];
  try {
    if (o.replace && /^\d+$/.test(o.replace)) {
      [m] = await db<SalesMtg[]>`update lead_meetings set starts_at = ${o.start}, ends_at = ${end}, host_id = ${host.id}, kind = ${o.kind}, room_url = ${room},
          notes = ${o.agenda || null}, reminded = false where id = ${o.replace} and lead_id = ${lead.id} and status = 'booked'
        returning id, starts_at, ends_at, room_url, kind, notes as agenda`;
      updated = !!m;
    }
    if (!m) {
      [m] = await db<SalesMtg[]>`insert into lead_meetings (lead_id, host_id, starts_at, ends_at, room_url, notes, kind, scheduled_by)
        values (${lead.id}, ${host.id}, ${o.start}, ${end}, ${room}, ${o.agenda || null}, ${o.kind}, ${o.by.id})
        returning id, starts_at, ends_at, room_url, kind, notes as agenda`;
    }
  } catch {
    throw new Error(`${host.name} already has a meeting at that time.`);
  }
  if (!m) throw new Error("The meeting wasn't saved.");
  const k = kindInfo(m.kind);
  const seq = updated ? seqNow() : 0;
  // Microsoft Teams: move the existing Outlook meeting, or create one (a new host gets a new meeting).
  let outlook = false;
  if (graphOn()) {
    if (updated && prev?.graph_event_id && prev.graph_mailbox?.toLowerCase() === host.email.toLowerCase()) {
      try { await moveTeamsMeeting(host.email, prev.graph_event_id, m.starts_at, m.ends_at, `${k.title}`); outlook = true; }
      catch (err) { console.error("[teams] move failed", err instanceof Error ? err.message : err); }
    } else {
      if (updated && prev?.graph_event_id) await cancelTeams(m.id, "This meeting has moved to a new invitation.");
      outlook = await attachTeams(m, host, lead, k.title,
        `<p>${esc(k.blurb)}</p>${m.agenda ? `<p><strong>Agenda:</strong><br>${esc(m.agenda).replace(/\n/g, "<br>")}</p>` : ""}<p>${esc(host.name)}, Labb</p>`);
    }
  }
  const e = inviteEmail(lead, m, host, updated, outlook);
  const sent = await sendMail(lead.email, e.subject, e.html, e.text, {
    replyTo: host.email, track: { lead_meeting: String(m.id) },
    attachments: outlook ? [] : [{ filename: "labb-meeting.ics", content: ics(m, k.title, `${k.blurb}\n${m.agenda ? `\nAgenda:\n${m.agenda}\n` : ""}\nVideo meeting: ${m.room_url}`, { name: `${host.name}, Labb`, email: host.email }, lead.email, false, seq), type: "text/calendar; method=REQUEST" }],
  });
  const rec = absoluteUrl(`/admin/leads/${lead.id}`);
  await sendMail(host.email, `${updated ? "Updated" : "Scheduled"}: ${k.label} with ${leadName(lead)}, ${fmtWhen(m.starts_at)}`,
    emailLayout(`${k.label} ${updated ? "updated" : "scheduled"}`, `<p>${esc(k.label)} with <strong>${esc(leadName(lead))}</strong>${lead.company ? `, ${esc(lead.company)}` : ""}.</p><p style="font-size:17px"><strong>${esc(fmtWhen(m.starts_at))}</strong></p><p>${esc(lead.email)}${lead.phone ? ` · ${esc(lead.phone)}` : ""}</p>${m.agenda ? `<p><strong>Agenda:</strong> ${esc(m.agenda)}</p>` : ""}<p>${outlook ? "The Teams meeting is on your Outlook calendar. " : ""}${joinLine(m.room_url)}</p>`, { href: rec, label: "Open the lead" }),
    `${k.label} with ${leadName(lead)}: ${fmtWhen(m.starts_at)}\n${joinText(m.room_url)}\nLead: ${rec}`,
    { replyTo: lead.email, attachments: outlook ? [] : [{ filename: "labb-meeting.ics", content: ics(m, `${k.label}: ${leadName(lead)}`, `Video meeting: ${m.room_url}\nLead: ${rec}`, { name: "Labb", email: "info@labb.com" }, host.email, false, seq), type: "text/calendar; method=REQUEST" }] });
  await db`update leads set status = case when status = 'new' then 'contacted' else status end, updated_at = now() where id = ${lead.id}`;
  await logLeadEvent(lead.id, "meeting", `${k.label} ${updated ? "moved to" : "scheduled for"} ${fmtWhen(m.starts_at)} with ${host.name}${sent ? "; invite emailed to " + lead.email : "; the invite email did not send"}`, o.by);
  return { sent, updated };
}

// Record how a meeting went.
export async function finishMeeting(leadId: string, meetingId: string, status: "completed" | "no-show", outcome: string, by: { id: string; name: string }) {
  const db = sql();
  const [m] = await db<{ kind: string; starts_at: Date }[]>`update lead_meetings set status = ${status}, outcome = ${outcome || null}, done_at = now()
    where id = ${meetingId} and lead_id = ${leadId} and status in ('booked', 'completed', 'no-show') returning kind, starts_at`;
  if (!m) return false;
  if (status === "completed" && m.kind !== "close") await db`update leads set status = case when status in ('new', 'contacted') then 'qualified' else status end, updated_at = now() where id = ${leadId}`;
  await logLeadEvent(leadId, "meeting", `${kindInfo(m.kind).label} on ${fmtWhen(m.starts_at)}: ${status === "completed" ? "completed" : "no-show"}${outcome ? `. ${outcome}` : ""}`, by);
  return true;
}

export async function leadMeetings(leadId: string) {
  return sql()<{ id: string; kind: string; status: string; starts_at: Date; ends_at: Date; room_url: string; host_id: string; host_name: string; notes: string | null; outcome: string | null }[]>`
    select g.id, g.kind, g.status, g.starts_at, g.ends_at, g.room_url, g.host_id, m.name as host_name, g.notes, g.outcome
    from lead_meetings g join members m on m.id = g.host_id where g.lead_id = ${leadId} order by g.starts_at desc`;
}

// Pipeline counts for the meetings page.
export async function pipeline() {
  return sql()<{ kind: string; upcoming: number; completed: number; noshow: number; completed30: number }[]>`
    select kind, count(*) filter (where status = 'booked' and ends_at > now())::int as upcoming,
      count(*) filter (where status = 'completed')::int as completed, count(*) filter (where status = 'no-show')::int as noshow,
      count(*) filter (where status = 'completed' and starts_at > now() - interval '30 days')::int as completed30
    from lead_meetings group by kind`;
}
