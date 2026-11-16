import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { isTsStatus, tsStatusLabel } from "@/lib/tradeShows";

// Admin updates a trade show request's status and the note the member sees.
export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/trade-shows");
  if (!(await sameOrigin())) return go(req, "/admin/trade-shows");
  const fd = await req.formData();
  const id = field(fd, "id", 20);
  const status = field(fd, "status", 20);
  const note = field(fd, "admin_note", 500) || null;
  if (!/^\d+$/.test(id) || !isTsStatus(status)) return go(req, "/admin/trade-shows");
  const [r] = await sql()<{ show_name: string }[]>`
    update trade_show_requests set status = ${status}, admin_note = ${note}, updated_at = now() where id = ${id} returning show_name`;
  if (r) await setFlash(`${r.show_name}: ${tsStatusLabel(status)}.`, "ok", undefined, "/admin");
  return go(req, "/admin/trade-shows");
}
