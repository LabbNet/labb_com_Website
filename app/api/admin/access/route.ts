import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";

// Superadmin only: set admin portal access and reads access (dual access) for one person.
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m || m.role !== "admin") return go(req, "/login?next=/admin/access");
  const db = sql();
  const [me] = await db<{ superadmin: boolean }[]>`select superadmin from members where id = ${m.id}`;
  if (!me?.superadmin || !(await sameOrigin())) return go(req, "/admin/crm");
  const fd = await req.formData();
  const id = field(fd, "id", 40);
  const admin = field(fd, "admin", 2) === "1";
  const reads = field(fd, "reads", 10);
  const [t] = await db<{ id: string; name: string; role: string; superadmin: boolean }[]>`select id, name, role, superadmin from members where id::text = ${id}`;
  if (!t || t.superadmin) return go(req, "/admin/access");
  const readRole = reads === "reader" ? "reader" : reads === "super" || reads === "approver" ? "super" : null;
  const approver = reads === "approver";
  if (approver) await db`update members set read_approver = false where read_approver and id <> ${t.id} and not superadmin`;
  // Role: admin portal if checked; reads-only if just reads; otherwise the account is disabled.
  const role = admin ? "admin" : readRole ? "reader" : t.role === "admin" || t.role === "reader" ? t.role : t.role;
  const disable = !admin && !readRole;
  await db`update members set role = ${role}, read_role = ${readRole}, read_approver = ${approver},
    status = case when ${disable} then 'disabled' when status = 'disabled' then 'active' else status end,
    session_version = session_version + 1, updated_at = now() where id = ${t.id}`;
  await setFlash(disable ? `${t.name} no longer has access; the account is disabled.` : `${t.name}: ${admin ? "admin portal" : ""}${admin && readRole ? " and " : ""}${readRole ? (approver ? "reads approver" : readRole === "super" ? "super read admin" : "read admin") : ""}.`, "ok", undefined, "/admin");
  return go(req, "/admin/access");
}
