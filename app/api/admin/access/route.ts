import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { createToken, EMAIL_RE, logEvent } from "@/lib/auth";
import { sendInvite } from "@/lib/invites";
import { absoluteUrl } from "@/lib/site";

// Superadmin only: set admin portal access and reads access (dual access) for one person.
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m || m.role !== "admin") return go(req, "/login?next=/admin/access");
  const db = sql();
  const [me] = await db<{ superadmin: boolean }[]>`select superadmin from members where id = ${m.id}`;
  if (!me?.superadmin || !(await sameOrigin())) return go(req, "/admin/crm");
  const fd = await req.formData();
  const action = field(fd, "action", 20);
  const flash = (msg: string, kind: "ok" | "error" = "ok", link?: string) => setFlash(msg, kind, link, "/admin");

  // Add a Labb admin: account plus emailed setup link.
  if (action === "add") {
    const name = field(fd, "name", 120), email = field(fd, "email", 160).toLowerCase();
    if (!name || !EMAIL_RE.test(email)) { await flash("Enter a name and a valid email address.", "error"); return go(req, "/admin/access"); }
    const [dup] = await db<{ name: string; role: string }[]>`select name, role from members where lower(email) = ${email}`;
    if (dup) { await flash(`${dup.name} already has an account with ${email}${dup.role === "admin" ? " and is a Labb admin" : ". Change their access in the list below if needed"}.`, "error"); return go(req, "/admin/access"); }
    let base = email.split("@")[0].replace(/[^a-z0-9._-]/g, "").slice(0, 34);
    if (base.length < 3) base = (base + "admin").slice(0, 34);
    const taken = new Set((await db<{ u: string }[]>`select lower(username) as u from members where lower(username) like ${base + "%"}`).map((r) => r.u));
    let username = base;
    for (let n = 2; taken.has(username); n++) username = `${base}${n}`;
    const [nm] = await db<{ id: string; email: string; name: string; username: string }[]>`
      insert into members (username, email, name, role, created_by) values (${username}, ${email}, ${name}, 'admin', ${m.id}) returning id, email, name, username`;
    await logEvent(nm.id, "created", "role admin", m.id);
    const r = await sendInvite(nm);
    await flash(r.sent ? `${name} added as a Labb admin. Setup email sent to ${email}.` : `${name} added. Email isn't set up, so send them this setup link (expires in 7 days):`, "ok", r.sent ? undefined : r.link);
    return go(req, "/admin/access");
  }
  const id = field(fd, "id", 40);
  if (action === "resend" || action === "reset") {
    const [t] = await db<{ id: string; email: string; name: string; username: string; role: string; status: string; superadmin: boolean }[]>`
      select id, email, name, username, role, status, superadmin from members where id::text = ${id}`;
    if (!t || t.superadmin) return go(req, "/admin/access");
    if (action === "resend" && t.status === "invited") {
      const r = await sendInvite(t);
      await flash(r.sent ? `Setup email re-sent to ${t.email}.` : `Send ${t.name} this setup link (expires in 7 days):`, "ok", r.sent ? undefined : r.link);
    } else if (action === "reset" && t.status === "active") {
      const token = await createToken(t.id, "reset");
      await logEvent(t.id, "reset_link_created", undefined, m.id);
      await flash(`Send ${t.name} this password reset link (expires in 1 hour):`, "ok", absoluteUrl(`/reset-password?token=${token}`));
    }
    return go(req, "/admin/access");
  }
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
  await flash(disable ? `${t.name} no longer has access; the account is disabled.` : `${t.name}: ${admin ? "admin portal" : ""}${admin && readRole ? " and " : ""}${readRole ? (approver ? "reads approver" : readRole === "super" ? "super read admin" : "read admin") : ""}.`);
  return go(req, "/admin/access");
}
