import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { emailPartner, logLeadEvent, type LeadRow } from "@/lib/leads";
import { isStatus, statusLabel } from "@/lib/segments";

// A CPP member updates a lead Labb passed to them. Logged in the lead's history with their name.
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m) return go(req, "/login?next=/members/leads");
  if (!(await sameOrigin())) return go(req, "/members/leads");
  const fd = await req.formData();
  const id = field(fd, "id", 20);
  if (field(fd, "action", 20) === "pass") return passLead(req, m, id, field(fd, "partner", 40));
  const status = field(fd, "status", 20);
  const note = field(fd, "note", 2000);
  if (!/^\d+$/.test(id)) return go(req, "/members/leads");
  const db = sql();
  const [lead] = await db<{ status: string; company: string | null; email: string }[]>`
    select status, company, email from leads where id = ${id} and partner_id = ${m.id} and owner = 'partner'`;
  if (!lead) return go(req, "/members/leads");
  const actor = { id: m.id, name: m.clinic ? `${m.name} (${m.clinic})` : m.name };

  let changed = false;
  if (isStatus(status) && status !== lead.status) {
    await db`update leads set status = ${status}, updated_at = now() where id = ${id}`;
    await logLeadEvent(id, "status", `${statusLabel(lead.status)} to ${statusLabel(status)}`, actor);
    changed = true;
  }
  if (note) {
    await logLeadEvent(id, "note", note, actor);
    await db`update leads set updated_at = now() where id = ${id}`;
    changed = true;
  }
  if (changed) await setFlash(`Saved your update for ${lead.company || lead.email}.`, "ok", undefined, "/members");
  return go(req, "/members/leads");
}

// A CPP member hands a lead to another active CPP member. Labb sees the hand-off in the lead history.
async function passLead(req: Request, m: { id: string; name: string; clinic: string | null }, id: string, partnerId: string) {
  if (!/^\d+$/.test(id)) return go(req, "/members/leads");
  const db = sql();
  const [lead] = await db<LeadRow[]>`select * from leads where id = ${id} and partner_id = ${m.id} and owner = 'partner'`;
  if (!lead) return go(req, "/members/leads");
  const [to] = await db<{ id: string; name: string; email: string; clinic: string | null }[]>`
    select id, name, email, clinic from members where id = ${partnerId} and id <> ${m.id} and role = 'member' and status = 'active' and cpp_status = 'active'`;
  if (!to) {
    await setFlash("Choose an active CPP member to pass the lead to.", "error", undefined, "/members");
    return go(req, "/members/leads");
  }
  await db`update leads set partner_id = ${to.id}, passed_at = now(), passed_by = ${m.id}, updated_at = now() where id = ${id}`;
  const from = m.clinic ? `${m.name} (${m.clinic})` : m.name;
  const label = to.clinic ? `${to.clinic} (${to.name})` : to.name;
  await logLeadEvent(id, "passed", `${label}, passed by CPP member ${from}`, { id: m.id, name: from });
  const sent = await emailPartner(to, lead);
  await logLeadEvent(id, "partner_emailed", sent ? `Emailed ${to.email}` : `Email not sent to ${to.email}`, { id: m.id, name: from });
  await setFlash(`Passed ${lead.company || lead.email} to ${label}.`, "ok", undefined, "/members");
  return go(req, "/members/leads");
}
