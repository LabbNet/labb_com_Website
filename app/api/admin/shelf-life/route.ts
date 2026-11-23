import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { isSlrStatus, slrStatusLabel } from "@/lib/shelfLife";

// Admin updates a lot extension request's status and the note the member sees.
export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/shelf-life");
  if (!(await sameOrigin())) return go(req, "/admin/shelf-life");
  const fd = await req.formData();
  const id = field(fd, "id", 20);
  const status = field(fd, "status", 20);
  const note = field(fd, "admin_note", 500) || null;
  if (!/^\d+$/.test(id) || !isSlrStatus(status)) return go(req, "/admin/shelf-life");
  const [r] = await sql()<{ lot_number: string }[]>`
    update shelf_life_requests set status = ${status}, admin_note = ${note}, updated_at = now() where id = ${id} returning lot_number`;
  if (r) await setFlash(`Lot ${r.lot_number}: ${slrStatusLabel(status)}.`, "ok", undefined, "/admin");
  return go(req, "/admin/shelf-life");
}
