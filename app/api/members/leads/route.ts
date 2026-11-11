import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { logLeadEvent } from "@/lib/leads";
import { isStatus, statusLabel } from "@/lib/segments";

// A CPP member updates a lead Labb passed to them. Logged in the lead's history with their name.
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m) return go(req, "/login?next=/members/leads");
  if (!(await sameOrigin())) return go(req, "/members/leads");
  const fd = await req.formData();
  const id = field(fd, "id", 20);
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
