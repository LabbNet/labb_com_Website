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
    const role = "member"; // Labb admins are added in Settings -> Admin users (superadmin)
    const cppStart = /^\d{4}-\d{2}-\d{2}$/.test(field(fd, "cpp_start", 10)) ? field(fd, "cpp_start", 10) : null;
    if (!name || !EMAIL_RE.test(email)) {
      await flash(`Enter a name and a valid email address (received "${email || "blank"}").`, undefined, "error");
      return go(req, "/admin/members");
    }
    // Email must be new.
    const [byEmail] = await db<{ name: string }[]>`select name from members where lower(email) = ${email} limit 1`;
    if (byEmail) {
      await flash(`${byEmail.name} already has an account with ${email}. Open them in the list below instead of adding them again.`, undefined, "error");
      return go(req, "/admin/members");
    }
    // Username: a typed one must be valid and free. A browser that autofills the admin's own
    // sign-in name is ignored. A blank one is built from the email and made unique automatically.
    let typed = (field(fd, "new_member_username", 40) || "").toLowerCase().trim();
    if (typed && typed === admin.username.toLowerCase()) typed = "";
    let username: string;
    if (typed) {
      if (!USERNAME_RE.test(typed)) {
        await flash(`The username "${typed}" isn't valid. Use 3 to 40 lowercase letters, numbers, dots, dashes or underscores, or leave it blank.`, undefined, "error");
        return go(req, "/admin/members");
      }
      const [byUser] = await db<{ name: string }[]>`select name from members where lower(username) = ${typed} limit 1`;
      if (byUser) {
        await flash(`The username "${typed}" is taken by ${byUser.name}. Enter a different username, or leave it blank.`, undefined, "error");
        return go(req, "/admin/members");
      }
      username = typed;
    } else {
      let base = email.split("@")[0].replace(/[^a-z0-9._-]/g, "").slice(0, 34);
      if (base.length < 3) base = (base + "member").slice(0, 34);
      const taken = new Set((await db<{ username: string }[]>`select lower(username) as username from members where lower(username) like ${base + "%"}`).map((r) => r.username));
      username = base;
      for (let n = 2; taken.has(username); n++) username = `${base}${n}`;
    }
    const [m] = await db<{ id: string; email: string; name: string; username: string }[]>`
      insert into members (username, email, name, clinic, role, created_by, cpp_start_date) values (${username}, ${email}, ${name}, ${clinic}, ${role}, ${admin.id}, ${cppStart})
      returning id, email, name, username`;
    await logEvent(m.id, "created", `role ${role}`, admin.id);
    const { link, sent } = await sendInvite(m);
    await logEvent(m.id, "invite_sent", sent ? "emailed" : "link only", admin.id);
    await flash(sent ? `Account created for ${name}. Setup email sent to ${email}.` : `Account created for ${name}. Email isn't set up, so send them this setup link (expires in 7 days):`, sent ? undefined : link);
    return go(req, "/admin/members");
  }

  const id = field(fd, "id", 40);
  const [m] = await db<{ id: string; email: string; name: string; username: string; status: string }[]>`select id, email, name, username, status from members where id = ${id} and role not in ('reader', 'admin')`;
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
  } else if (action === "promote" || action === "demote") {
    // Admin access is managed in Settings -> Admin users, by the superadmin.
    await flash("Admin access is managed in Settings, Admin users.", undefined, "error");
  } else if (action === "enable") {
    const [row] = await db<{ password_hash: string | null }[]>`select password_hash from members where id = ${m.id}`;
    const status = row.password_hash ? "active" : "invited";
    await db`update members set status = ${status}, updated_at = now() where id = ${m.id}`;
    await logEvent(m.id, "enabled", undefined, admin.id);
    await flash(`${m.name} is re-enabled${status === "invited" ? ". They still need to finish setup; re-send the invite." : "."}`);
  }
  return go(req, "/admin/members");
}
