import { cookies } from "next/headers";
import { createToken, currentMember, EMAIL_RE, logEvent, sameOrigin, USERNAME_RE } from "@/lib/auth";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { sendInvite } from "@/lib/invites";
import { absoluteUrl } from "@/lib/site";

// Admin actions on member accounts. Results are shown once on /admin/members via a short-lived flash cookie.
async function flash(msg: string, link?: string, kind: "ok" | "error" = "ok") {
  (await cookies()).set("labb_flash", JSON.stringify({ msg, link, kind }), { httpOnly: true, sameSite: "strict", path: "/admin", maxAge: 120, secure: process.env.NODE_ENV === "production" });
}

export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/members");
  if (!(await sameOrigin())) return go(req, "/admin/members");
  const fd = await req.formData();
  const action = field(fd, "action", 20);
  const db = sql();

  if (action === "create") {
    const name = field(fd, "name", 120);
    const email = field(fd, "email", 160).toLowerCase();
    const clinic = field(fd, "clinic", 160) || null;
    const username = (field(fd, "username", 40) || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const role = fd.get("role") === "admin" ? "admin" : "member";
    if (!name || !EMAIL_RE.test(email)) {
      await flash("Enter a name and a valid email address.", undefined, "error");
      return go(req, "/admin/members");
    }
    if (!USERNAME_RE.test(username)) {
      await flash("Usernames are 3 to 40 characters: lowercase letters, numbers, dots, dashes or underscores.", undefined, "error");
      return go(req, "/admin/members");
    }
    const clash = await db`select 1 from members where lower(email) = ${email} or lower(username) = ${username}`;
    if (clash.length) {
      await flash("A member with that email or username already exists.", undefined, "error");
      return go(req, "/admin/members");
    }
    const [m] = await db<{ id: string; email: string; name: string; username: string }[]>`
      insert into members (username, email, name, clinic, role, created_by) values (${username}, ${email}, ${name}, ${clinic}, ${role}, ${admin.id})
      returning id, email, name, username`;
    await logEvent(m.id, "created", `role ${role}`, admin.id);
    const { link, sent } = await sendInvite(m);
    await logEvent(m.id, "invite_sent", sent ? "emailed" : "link only", admin.id);
    await flash(sent ? `Account created for ${name}. Setup email sent to ${email}.` : `Account created for ${name}. Email isn't set up, so send them this setup link (expires in 7 days):`, sent ? undefined : link);
    return go(req, "/admin/members");
  }

  const id = field(fd, "id", 40);
  const [m] = await db<{ id: string; email: string; name: string; username: string; status: string }[]>`select id, email, name, username, status from members where id = ${id}`;
  if (!m) return go(req, "/admin/members");

  if (action === "resend") {
    if (m.status === "active") {
      await flash(`${m.name} has already set up their account. Use "Reset link" if they forgot their password.`, undefined, "error");
    } else {
      const { link, sent } = await sendInvite(m);
      await logEvent(m.id, "invite_sent", sent ? "emailed" : "link only", admin.id);
      await flash(sent ? `Setup email re-sent to ${m.email}.` : `Send ${m.name} this setup link (expires in 7 days):`, sent ? undefined : link);
    }
  } else if (action === "reset") {
    if (m.status !== "active") {
      await flash(`${m.name} hasn't set up their account yet. Re-send the invite instead.`, undefined, "error");
    } else {
      const token = await createToken(m.id, "reset");
      await logEvent(m.id, "reset_link_created", undefined, admin.id);
      await flash(`Send ${m.name} this password reset link (expires in 1 hour):`, absoluteUrl(`/reset-password?token=${token}`));
    }
  } else if (action === "disable") {
    if (m.id === admin.id) {
      await flash("You can't disable your own account.", undefined, "error");
    } else {
      await db`update members set status = 'disabled', session_version = session_version + 1, updated_at = now() where id = ${m.id}`;
      await logEvent(m.id, "disabled", undefined, admin.id);
      await flash(`${m.name} is disabled and signed out everywhere.`);
    }
  } else if (action === "enable") {
    const [row] = await db<{ password_hash: string | null }[]>`select password_hash from members where id = ${m.id}`;
    const status = row.password_hash ? "active" : "invited";
    await db`update members set status = ${status}, updated_at = now() where id = ${m.id}`;
    await logEvent(m.id, "enabled", undefined, admin.id);
    await flash(`${m.name} is re-enabled${status === "invited" ? ". They still need to finish setup; re-send the invite." : "."}`);
  }
  return go(req, "/admin/members");
}
