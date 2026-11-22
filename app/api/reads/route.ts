import { sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go, safePath } from "@/lib/http";
import { easternToDate } from "@/lib/imageSize";
import { addDays, readAccess } from "@/lib/reads";
import { sendInvite } from "@/lib/invites";

// Reads schedule actions. Read admins request; the approver's own changes take effect right away.
export async function POST(req: Request) {
  const a = await readAccess();
  if (!a) return go(req, "/login?next=/reads");
  if (!a.reader && !a.admin) return go(req, "/members");
  if (!(await sameOrigin())) return go(req, "/reads");
  const fd = await req.formData();
  const action = field(fd, "action", 30);
  const back = safePath(field(fd, "back", 300), "/reads");
  const flash = (msg: string, kind: "ok" | "error" = "ok") => setFlash(msg, kind, undefined, "/");
  const db = sql();
  const me = a.m.id;
  const num = (k: string) => (/^\d+$/.test(field(fd, k, 20)) ? field(fd, k, 20) : null);

  // Shift times from a date and start/end times in Eastern time; an end at or before the start runs past midnight.
  const times = () => {
    const date = field(fd, "date", 10), start = field(fd, "start", 5), end = field(fd, "end", 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null;
    const s = easternToDate(`${date}T${start}`);
    const e = easternToDate(`${end > start ? date : addDays(date, 1)}T${end}`);
    if (!s || !e || e <= s || e.getTime() - s.getTime() > 24 * 3600_000) return null;
    return { s, e };
  };
  const whoFor = async () => {
    const id = field(fd, "member", 40);
    if (!id || !a.approver) return a.reader ? me : null;
    const [m] = await db`select id from members where id::text = ${id} and (read_role is not null or read_approver)`;
    return m ? id : null;
  };

  if (action === "add") {
    const t = times();
    const member = await whoFor();
    if (!t || !member) { await flash("Enter a date, a start time and an end time (up to 24 hours).", "error"); return go(req, back); }
    const status = a.approver ? "approved" : "requested";
    await db`insert into read_shifts (member_id, starts_at, ends_at, status, action, note, requested_by, decided_by, decided_at)
      values (${member}, ${t.s}, ${t.e}, ${status}, 'add', ${field(fd, "note", 300) || null}, ${me}, ${a.approver ? me : null}, ${a.approver ? new Date() : null})`;
    await flash(a.approver ? "Shift scheduled." : "Shift requested. It shows as pending until Angela approves it.");
  } else if (action === "change" || action === "remove") {
    const id = num("id");
    const [s] = id ? await db<{ id: string; member_id: string; status: string; starts_at: Date; ends_at: Date }[]>`
      select id, member_id, status, starts_at, ends_at from read_shifts where id = ${id} and status in ('approved', 'requested')` : [];
    if (!s || (!a.approver && s.member_id !== me)) { await flash("You can change only your own shifts.", "error"); return go(req, back); }
    const t = action === "change" ? times() : { s: s.starts_at, e: s.ends_at };
    if (!t) { await flash("Enter a date, a start time and an end time (up to 24 hours).", "error"); return go(req, back); }
    const note = field(fd, "note", 300) || null;
    if (a.approver || s.status === "requested") {
      // The approver's changes, and changes to a request not yet approved, apply directly.
      if (action === "remove") await db`update read_shifts set status = 'canceled', decided_by = ${me}, decided_at = now() where id = ${s.id}`;
      else await db`update read_shifts set starts_at = ${t.s}, ends_at = ${t.e}, note = coalesce(${note}, note) where id = ${s.id}`;
      await flash(action === "remove" ? "Shift removed." : "Shift updated.");
    } else {
      // An approved shift stays on the schedule until Angela approves the change or removal.
      await db`update read_shifts set status = 'canceled', decided_by = ${me}, decided_at = now()
        where replaces_id = ${s.id} and status = 'requested' and requested_by = ${me}`;
      await db`insert into read_shifts (member_id, starts_at, ends_at, status, action, replaces_id, note, requested_by)
        values (${s.member_id}, ${t.s}, ${t.e}, 'requested', ${action}, ${s.id}, ${note}, ${me})`;
      await flash(action === "remove" ? "Removal requested. The shift stays on the schedule until Angela approves." : "Change requested. The current shift stays until Angela approves.");
    }
  } else if ((action === "approve" || action === "decline") && a.approver) {
    for (const id of fd.getAll("id").map(String).filter((x) => /^\d+$/.test(x))) {
      const [r] = await db<{ id: string; action: string; replaces_id: string | null }[]>`select id, action, replaces_id from read_shifts where id = ${id} and status = 'requested'`;
      if (!r) continue;
      if (action === "decline") {
        await db`update read_shifts set status = 'declined', decided_by = ${me}, decided_at = now() where id = ${r.id}`;
      } else if (r.action === "remove") {
        await db`update read_shifts set status = 'canceled', decided_by = ${me}, decided_at = now() where id = ${r.replaces_id}`;
        await db`update read_shifts set status = 'replaced', decided_by = ${me}, decided_at = now() where id = ${r.id}`;
      } else {
        if (r.replaces_id) await db`update read_shifts set status = 'replaced', decided_by = ${me}, decided_at = now() where id = ${r.replaces_id}`;
        await db`update read_shifts set status = 'approved', decided_by = ${me}, decided_at = now() where id = ${r.id}`;
      }
    }
    await flash(action === "approve" ? "Approved." : "Declined.");
  } else if (action === "adjust") {
    const date = field(fd, "date", 10);
    const hours = Number(field(fd, "hours", 8));
    const reason = field(fd, "reason", 500);
    const member = await whoFor();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isFinite(hours) || hours === 0 || Math.abs(hours) > 24 || !reason || !member) {
      await flash("Enter the date, the hours to add or remove (for example 1.5 or -2) and a reason.", "error");
      return go(req, back);
    }
    const status = a.approver ? "approved" : "requested";
    await db`insert into read_adjustments (member_id, work_date, hours, reason, status, requested_by, decided_by, decided_at)
      values (${member}, ${date}, ${Math.round(hours * 100) / 100}, ${reason}, ${status}, ${me}, ${a.approver ? me : null}, ${a.approver ? new Date() : null})`;
    await flash(a.approver ? "Hours changed." : "Hours change requested. It counts once Angela approves it.");
  } else if ((action === "adj-approve" || action === "adj-decline") && a.approver) {
    const ids = fd.getAll("id").map(String).filter((x) => /^\d+$/.test(x));
    if (ids.length) await db`update read_adjustments set status = ${action === "adj-approve" ? "approved" : "declined"}, decided_by = ${me}, decided_at = now()
      where id = any(${ids}) and status = 'requested'`;
    await flash(action === "adj-approve" ? "Hours approved." : "Hours change declined.");
  } else if (action === "team-add" && (a.approver || a.admin)) {
    const name = field(fd, "name", 120), email = field(fd, "email", 200).toLowerCase();
    const role = field(fd, "read_role", 10) === "super" ? "super" : "reader";
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { await flash("Enter a name and an email address.", "error"); return go(req, back); }
    const [existing] = await db<{ id: string; name: string; email: string; username: string; role: string; status: string }[]>`
      select id, name, email, username, role, status from members where lower(email) = ${email}`;
    if (existing) {
      await db`update members set read_role = ${role} where id = ${existing.id}`;
      await flash(`${existing.name} added to the read team with their existing account.`);
    } else {
      let username = email.split("@")[0].replace(/[^a-z0-9._-]/g, "") || "reader";
      const [taken] = await db`select 1 from members where lower(username) = ${username}`;
      if (taken) username = `${username}.${Math.random().toString(36).slice(2, 6)}`;
      const [m] = await db<{ id: string; name: string; email: string; username: string; role: string }[]>`
        insert into members (username, email, name, role, status, read_role, created_by) values (${username}, ${email}, ${name}, 'reader', 'invited', ${role}, ${me})
        returning id, name, email, username, role`;
      const r = await sendInvite(m);
      await flash(r.sent ? `${name} added. Their setup link was emailed.` : `${name} added, but the email didn't send. Share this setup link: ${r.link}`, r.sent ? "ok" : "error");
    }
  } else if (action === "team-invite" && (a.approver || a.admin)) {
    const id = field(fd, "id", 40);
    const [m] = await db<{ id: string; name: string; email: string; username: string; role: string }[]>`
      select id, name, email, username, role from members where id::text = ${id} and status = 'invited' and (read_role is not null or read_approver)`;
    if (m) {
      const r = await sendInvite(m);
      await flash(r.sent ? `Setup link emailed to ${m.email}.` : `The email didn't send. Share this setup link: ${r.link}`, r.sent ? "ok" : "error");
    }
  } else if (action === "team-role" && (a.approver || a.admin)) {
    const id = field(fd, "id", 40);
    const role = field(fd, "read_role", 10);
    const v = role === "super" ? "super" : role === "reader" ? "reader" : null;
    // The approver keeps access; removing a reads-only account disables it.
    await db`update members set read_role = ${v} where id::text = ${id} and not read_approver`;
    if (!v) await db`update members set status = 'disabled', session_version = session_version + 1 where id::text = ${id} and role = 'reader'`;
    await flash(v ? "Read access updated." : "Removed from the read team.");
  }
  return go(req, back);
}
