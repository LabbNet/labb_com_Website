import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { esc, sendMail } from "@/lib/mail";
import { linkToken, tagLinks } from "@/lib/visitors";
import { emailBookingInvite, emailCancelled, etToUtc, finishMeeting, isKind, newToken, scheduleSalesMeeting, testLead, testToken } from "@/lib/meetings";
import { upsertPerson } from "@/lib/crm";
import { emailPartner, logLeadEvent, mergeLeads, type LeadRow } from "@/lib/leads";
import { isSegment, isStatus, segmentLabel, statusLabel } from "@/lib/segments";
import { sequenceName, startSequence, stopSequence } from "@/lib/sequences";

// Admin actions on a lead. Nothing here deletes a lead: every change is logged in lead_events.
export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/leads");
  if (!(await sameOrigin())) return go(req, "/admin/leads");
  const fd = await req.formData();
  const id = field(fd, "id", 20);
  const action = (fd.getAll("action").map(String).pop() || "").trim().slice(0, 20);
  if (!/^\d+$/.test(id)) return go(req, "/admin/leads");
  const nextField = field(fd, "back", 200);
  const back = nextField.startsWith("/admin/") ? nextField : `/admin/leads/${id}`;
  const db = sql();
  const [lead] = await db<LeadRow[]>`select * from leads where id = ${id}`;
  if (!lead) return go(req, "/admin/leads");
  const actor = { id: admin.id, name: admin.name };
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");

  if (action === "status") {
    const status = field(fd, "status", 20);
    if (isStatus(status) && status !== lead.status) {
      await db`update leads set status = ${status}, updated_at = now() where id = ${id}`;
      await logLeadEvent(id, "status", `${statusLabel(lead.status)} to ${statusLabel(status)}`, actor);
      await flash(`Status set to ${statusLabel(status)}.`);
    }
  } else if (action === "note") {
    const note = field(fd, "note", 4000);
    if (note) {
      await logLeadEvent(id, "note", note, actor);
      await db`update leads set updated_at = now() where id = ${id}`;
      await flash("Note saved.");
    }
  } else if (action === "segment") {
    const segment = field(fd, "segment", 40);
    if (isSegment(segment) && segment !== lead.segment) {
      await db`update leads set segment = ${segment}, updated_at = now() where id = ${id}`;
      await logLeadEvent(id, "segment", `${segmentLabel(lead.segment)} to ${segmentLabel(segment)}`, actor);
      await flash(`Segment changed to ${segmentLabel(segment)}.`);
    }
  } else if (action === "pass") {
    const partnerId = field(fd, "partner", 40);
    const [partner] = await db<{ id: string; name: string; email: string; clinic: string | null }[]>`
      select id, name, email, clinic from members where id = ${partnerId} and role = 'member' and status <> 'disabled'`;
    if (!partner) {
      await flash("Choose an active CPP member.", "error");
      return go(req, back);
    }
    await db`update leads set owner = 'partner', partner_id = ${partner.id}, passed_at = now(), passed_by = ${admin.id}, accepted_at = null, accepted_by = null, meeting_host = null, updated_at = now() where id = ${id}`;
    const label = partner.clinic ? `${partner.clinic} (${partner.name})` : partner.name;
    await logLeadEvent(id, "passed", label, actor);
    const sent = await emailPartner(partner, lead);
    await logLeadEvent(id, "partner_emailed", sent ? `Emailed ${partner.email}` : `Email not sent to ${partner.email} (email not configured)`, actor);
    await flash(sent ? `Lead passed to ${label} and they were emailed.` : `Lead passed to ${label}. Email isn't set up, so let them know it's in their CPP login.`, sent ? "ok" : "error");
  } else if (action === "return") {
    if (lead.owner === "partner") {
      await db`update leads set owner = 'labb', partner_id = null, accepted_at = null, accepted_by = null, updated_at = now() where id = ${id}`;
      await logLeadEvent(id, "returned", null, actor);
      await flash("Lead passed back to Labb.");
    }
  } else if (action === "sequence") {
    const seq = field(fd, "sequence", 80);
    const r = await startSequence(seq, lead, admin, false);
    if (!r.ok) await flash(r.error, "error");
    else {
      await logLeadEvent(id, "sequence", `${r.name} sequence started`, actor);
      await flash(`${r.name} sequence started. The first email went to ${lead.email}.`);
    }
  } else if (action === "sequence-stop") {
    const run = field(fd, "run", 20);
    const [r] = await db<{ sequence: string }[]>`select sequence from sequence_runs where id = ${/^\d+$/.test(run) ? run : "0"} and lead_id = ${id} and status = 'active'`;
    if (r) {
      await stopSequence(run);
      await logLeadEvent(id, "sequence", `${sequenceName(r.sequence)} sequence stopped`, actor);
      await flash(`${sequenceName(r.sequence)} sequence stopped.`);
    }
  } else if (action === "email") {
    // One-to-one email from a Labb admin. Sent from the Labb address with the admin as reply-to,
    // and logged in full on the lead history.
    const subject = field(fd, "subject", 200).replace(/[\r\n]+/g, " ").trim();
    const body = String(fd.get("body") ?? "").slice(0, 8000).replace(/\r\n/g, "\n").trim();
    if (!subject || !body) {
      await flash("Add a subject and a message.", "error");
      return go(req, back);
    }
    const linkify = (t: string) => esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#CF743C">$1</a>');
    const paras = body.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.55">${linkify(p).replace(/\n/g, "<br>")}</p>`).join("");
    const html = tagLinks(`<div style="font-family:Arial,Helvetica,sans-serif;color:#404951;max-width:600px;font-size:15px">${paras}
  <p style="font-size:12px;color:#5f6a74;border-top:1px solid #dfe5e5;padding-top:12px;margin-top:28px">Ramsey Diagnostics Corporation d/b/a Labb, 2115 Granby Street, Norfolk, VA 23517, info@labb.com</p></div>`, linkToken(lead.email));
    const text = `${body}\n\n--\nRamsey Diagnostics Corporation d/b/a Labb, 2115 Granby Street, Norfolk, VA 23517, info@labb.com`;
    const fromAddr = (process.env.MAIL_FROM || process.env.LEAD_FROM_EMAIL || "Labb <info@mail.labb.com>").match(/<([^>]+)>/)?.[1] || "info@mail.labb.com";
    const name = admin.name.replace(/[<>"\r\n]/g, "").trim() || "Labb";
    const sent = await sendMail(lead.email, subject, html, text, { from: `${name} at Labb <${fromAddr}>`, replyTo: admin.email });
    if (!sent) {
      await flash("The email didn't send. Check the email settings, then try again. Your message was not saved.", "error");
      return go(req, back);
    }
    await logLeadEvent(id, "emailed", `To ${lead.email}. Subject: ${subject}\n\n${body}`.slice(0, 4000), actor);
    await db`update leads set updated_at = now() where id = ${id}`;
    await flash(`Email sent to ${lead.email}. Replies go to ${admin.email}.`);
  } else if (action === "accept-labb" && field(fd, "test", 2) === "1") {
    // Send the admin the exact booking invite, with a working test booking link. Nothing on the lead changes.
    const hostField = field(fd, "host", 40) || "any";
    const [host] = hostField === "any" ? [null] : await db<{ name: string; email: string }[]>`
      select name, email from members where id = ${/^[0-9a-f-]{36}$/i.test(hostField) ? hostField : "00000000-0000-0000-0000-000000000000"} and role = 'admin'`;
    const me = await testLead(admin.id);
    const sent = me ? await emailBookingInvite(me, host ?? null, testToken(admin.id, host ? hostField : "any"), true) : false;
    await flash(sent ? `Test invite sent to ${admin.email}. Nothing was sent to ${lead.email}. Book a time from the test to get the confirmation and video link.` : "The test email didn't send. Check the email settings.", sent ? "ok" : "error");
  } else if (action === "accept-labb" || action === "resend-invite") {
    // Labb keeps the lead: assign it to a team member (or anyone available) and email the prospect a booking link.
    if (lead.owner !== "labb") {
      await flash("This lead is with a CPP member. Pass it back to Labb first.", "error");
      return go(req, back);
    }
    const hostField = action === "accept-labb" ? field(fd, "host", 40) : lead.meeting_host || "any";
    let host: { id: string; name: string; email: string; hours: number } | null = null;
    if (hostField !== "any") {
      [host] = await db<{ id: string; name: string; email: string; hours: number }[]>`
        select m.id, m.name, m.email, (select count(*)::int from meeting_hours h where h.member_id = m.id) as hours
        from members m where m.id = ${/^[0-9a-f-]{36}$/i.test(hostField) ? hostField : "00000000-0000-0000-0000-000000000000"} and m.role = 'admin' and m.status <> 'disabled'`;
      if (!host) {
        await flash("Choose a Labb team member.", "error");
        return go(req, back);
      }
    }
    const token = lead.book_token || newToken();
    await db`update leads set accepted_at = coalesce(accepted_at, now()), accepted_by = coalesce(accepted_by, ${admin.id}), meeting_host = ${host?.id ?? null},
      book_token = ${token}, status = case when status = 'new' then 'contacted' else status end, updated_at = now() where id = ${id}`;
    const label = host ? host.name : "any available Labb team member";
    if (action === "accept-labb") await logLeadEvent(id, "accepted", `Kept at Labb and assigned to ${label}`, actor);
    const sent = await emailBookingInvite(lead, host, token);
    await logLeadEvent(id, "prospect_emailed", sent ? `Meeting booking link sent to ${lead.email}` : `Booking link email to ${lead.email} did not send`, actor);
    const noHours = host ? host.hours === 0 : !(await db`select 1 from meeting_hours limit 1`).length;
    await flash(
      !sent ? `Saved, but the email to ${lead.email} didn't send. Check the email settings and use Resend booking link.`
        : noHours ? `Booking link sent to ${lead.email}, but ${host ? host.name : "no one on the team"} has meeting hours set, so there are no times to pick. Set hours under Sales, Meetings.`
        : `Booking link sent to ${lead.email}${host ? ` for a call with ${host.name}` : ""}.`,
      sent && !noHours ? "ok" : "error");
  } else if (action === "meeting-cancel") {
    const mid = field(fd, "meeting", 20);
    const [mt] = await db<{ id: string; starts_at: Date; ends_at: Date; room_url: string; host_name: string; host_email: string }[]>`
      update lead_meetings g set status = 'cancelled' from members m
      where g.id = ${/^\d+$/.test(mid) ? mid : "0"} and g.lead_id = ${id} and g.status = 'booked' and m.id = g.host_id
      returning g.id, g.starts_at, g.ends_at, g.room_url, m.name as host_name, m.email as host_email`;
    if (mt) {
      await emailCancelled(lead, mt, { name: mt.host_name, email: mt.host_email }, false, lead.book_token || null);
      await logLeadEvent(id, "meeting", `Meeting cancelled by Labb; ${lead.email} was emailed${lead.book_token ? " a link to pick a new time" : ""}`, actor);
      await flash("Meeting cancelled and the prospect was emailed.");
    }
  } else if (action === "meeting-schedule") {
    const kind = field(fd, "kind", 20);
    const date = field(fd, "date", 10);
    const time = field(fd, "time", 5);
    const minutes = Math.min(240, Math.max(15, Number(field(fd, "minutes", 3)) || 30));
    const tm = /^(\d{1,2}):(\d{2})$/.exec(time);
    if (!isKind(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !tm) { await flash("Choose the meeting type, date and time.", "error"); return go(req, back); }
    const start = etToUtc(date, Number(tm[1]) * 60 + Number(tm[2]));
    if (start.getTime() < Date.now() - 5 * 60000) { await flash("That time has already passed.", "error"); return go(req, back); }
    try {
      const r = await scheduleSalesMeeting(lead, {
        kind, start, minutes, hostId: field(fd, "host", 40) || admin.id, room: field(fd, "room", 300),
        agenda: String(fd.get("agenda") ?? "").slice(0, 2000).trim(), by: actor, replace: field(fd, "replace", 20) || undefined,
      });
      await flash(r.sent ? `${r.updated ? "Meeting moved" : "Meeting scheduled"}. The calendar invite was emailed to ${lead.email} and the host.` : "Meeting saved, but the invite email didn't send. Check email settings.", r.sent ? "ok" : "error");
    } catch (e) {
      await flash(e instanceof Error ? e.message : "The meeting wasn't scheduled.", "error");
    }
  } else if (action === "meeting-done" || action === "meeting-noshow") {
    const ok = await finishMeeting(id, field(fd, "meeting", 20).replace(/\D/g, "") || "0", action === "meeting-done" ? "completed" : "no-show", field(fd, "outcome", 1000), actor);
    await flash(ok ? (action === "meeting-done" ? "Meeting marked completed." : "Marked as a no-show.") : "That meeting wasn't found.", ok ? "ok" : "error");
  } else if (action === "client") {
    const on = fd.get("on") === "1";
    await db`update leads set existing_client = ${on}, updated_at = now() where id = ${id}`;
    if (on) await upsertPerson(lead.email.toLowerCase(), { stage: "customer" });
    await logLeadEvent(id, on ? "existing-client" : "prospect", on ? "Tagged as an existing client; removed from the prospect list" : "Existing client tag removed", actor);
    await flash(on ? "Tagged as an existing client. It's out of the lead list; find it under the Existing clients filter." : "Existing client tag removed.");
  } else if (action === "merge-other") {
    const raw = field(fd, "other", 254).replace(/^#/, "").trim();
    const [other] = /^\d+$/.test(raw)
      ? await db<{ id: string }[]>`select id::text from leads where id = ${raw} and id <> ${id}`
      : await db<{ id: string }[]>`select id::text from leads where lower(email) = ${raw.toLowerCase()} and id <> ${id} order by created_at limit 1`;
    if (!other) { await flash("No other lead matches that number or email.", "error"); return go(req, back); }
    try {
      await mergeLeads(id, [other.id], actor);
      await flash(`Lead #${other.id} was merged into this record.`);
    } catch (e) {
      await flash(e instanceof Error ? e.message : "The merge didn't go through.", "error");
    }
  } else if (action === "merge") {
    const ids = fd.getAll("dup").map(String).filter((x) => /^\d+$/.test(x) && x !== id).slice(0, 50);
    try {
      const n = await mergeLeads(id, ids, actor);
      await flash(`Merged ${n} ${n === 1 ? "submission" : "submissions"} into this lead. Their history, meetings and website visits are here now.`);
    } catch (e) {
      await flash(e instanceof Error ? e.message : "The merge didn't go through.", "error");
    }
  } else if (action === "archive" || action === "unarchive") {
    const archived = action === "archive";
    await db`update leads set archived = ${archived}, updated_at = now() where id = ${id}`;
    await logLeadEvent(id, action === "archive" ? "archived" : "unarchived", null, actor);
    await flash(archived ? "Lead archived. It stays in the database and can be restored." : "Lead restored.");
  }
  return go(req, back);
}
