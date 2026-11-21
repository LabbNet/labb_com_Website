import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { emailPartner, logLeadEvent, type LeadRow } from "@/lib/leads";
import { isSegment, isStatus, segmentLabel, statusLabel } from "@/lib/segments";
import { sequenceName, startSequence, stopSequence } from "@/lib/sequences";

// Admin actions on a lead. Nothing here deletes a lead: every change is logged in lead_events.
export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/leads");
  if (!(await sameOrigin())) return go(req, "/admin/leads");
  const fd = await req.formData();
  const id = field(fd, "id", 20);
  const action = field(fd, "action", 20);
  if (!/^\d+$/.test(id)) return go(req, "/admin/leads");
  const back = `/admin/leads/${id}`;
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
    await db`update leads set owner = 'partner', partner_id = ${partner.id}, passed_at = now(), passed_by = ${admin.id}, updated_at = now() where id = ${id}`;
    const label = partner.clinic ? `${partner.clinic} (${partner.name})` : partner.name;
    await logLeadEvent(id, "passed", label, actor);
    const sent = await emailPartner(partner, lead);
    await logLeadEvent(id, "partner_emailed", sent ? `Emailed ${partner.email}` : `Email not sent to ${partner.email} (email not configured)`, actor);
    await flash(sent ? `Lead passed to ${label} and they were emailed.` : `Lead passed to ${label}. Email isn't set up, so let them know it's in their CPP login.`, sent ? "ok" : "error");
  } else if (action === "return") {
    if (lead.owner === "partner") {
      await db`update leads set owner = 'labb', partner_id = null, updated_at = now() where id = ${id}`;
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
  } else if (action === "archive" || action === "unarchive") {
    const archived = action === "archive";
    await db`update leads set archived = ${archived}, updated_at = now() where id = ${id}`;
    await logLeadEvent(id, action === "archive" ? "archived" : "unarchived", null, actor);
    await flash(archived ? "Lead archived. It stays in the database and can be restored." : "Lead restored.");
  }
  return go(req, back);
}
