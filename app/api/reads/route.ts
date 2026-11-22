import { sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go, safePath } from "@/lib/http";
import { absoluteUrl as absolute } from "@/lib/site";
import { easternToDate } from "@/lib/imageSize";
import { addDays, readAccess } from "@/lib/reads";
import { sendInvite } from "@/lib/invites";
import { emailMember, NIGHT_END, NIGHT_START, notifyApprover, shiftText } from "@/lib/readsNotify";

// Reads schedule actions. Read admins request; the approver's own changes take effect right away.
export async function POST(req: Request) {
  const a = await readAccess();
  if (!a || (!a.reader && !a.superadmin)) return new Response("Not found", { status: 404 });
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
    // Night hours (9 PM to 7 AM) are Angela's; only she schedules them.
    if (!a.approver && (start < NIGHT_END || end > NIGHT_START || end <= start)) return "night" as const;
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
    if (t === "night") { await flash("Night hours, 9 PM to 7 AM, are scheduled by Angela. Choose times between 7 AM and 9 PM.", "error"); return go(req, back); }
    if (!t || !member) { await flash("Enter a date, a start time and an end time (up to 24 hours).", "error"); return go(req, back); }
    const status = a.approver ? "approved" : "requested";
    await db`insert into read_shifts (member_id, starts_at, ends_at, status, action, note, requested_by, decided_by, decided_at)
      values (${member}, ${t.s}, ${t.e}, ${status}, 'add', ${field(fd, "note", 300) || null}, ${me}, ${a.approver ? me : null}, ${a.approver ? new Date() : null})`;
    if (!a.approver) await notifyApprover(`Reads schedule request from ${a.m.name}`, [`${a.m.name} requested a new shift: ${shiftText(t.s, t.e)}.`, ...(field(fd, "note", 300) ? [`Note: ${field(fd, "note", 300)}`] : [])]);
    await flash(a.approver ? "Shift scheduled." : "Shift requested. It shows as pending until Angela approves it.");
  } else if (action === "change" || action === "remove") {
    const id = num("id");
    const [s] = id ? await db<{ id: string; member_id: string; status: string; starts_at: Date; ends_at: Date }[]>`
      select id, member_id, status, starts_at, ends_at from read_shifts where id = ${id} and status in ('approved', 'requested')` : [];
    if (!s || (!a.approver && s.member_id !== me)) { await flash("You can change only your own shifts.", "error"); return go(req, back); }
    const t = action === "change" ? times() : { s: s.starts_at, e: s.ends_at };
    if (t === "night") { await flash("Night hours, 9 PM to 7 AM, are scheduled by Angela. Choose times between 7 AM and 9 PM.", "error"); return go(req, back); }
    if (!t) { await flash("Enter a date, a start time and an end time (up to 24 hours).", "error"); return go(req, back); }
    const note = field(fd, "note", 300) || null;
    if (a.approver || s.status === "requested") {
      // The approver's changes, and changes to a request not yet approved, apply directly.
      if (action === "remove") await db`update read_shifts set status = 'canceled', decided_by = ${me}, decided_at = now() where id = ${s.id}`;
      else await db`update read_shifts set starts_at = ${t.s}, ends_at = ${t.e}, note = coalesce(${note}, note) where id = ${s.id}`;
      // Angela can hand a shift to someone else directly; it then sends that person reminders.
      const to = a.approver ? field(fd, "member", 40) : "";
      if (action === "change" && to && to !== s.member_id) {
        const [ok] = await db`select 1 from members where id::text = ${to} and (read_role is not null or read_approver)`;
        if (ok) {
          await db`update read_shifts set member_id = ${to}, auto_night = false where id = ${s.id}`;
          await emailMember(to, "You've been scheduled for reads", [`Angela scheduled you for ${shiftText(t.s, t.e)}.`]);
        }
      }
      if (!a.approver) await notifyApprover(`Reads schedule change from ${a.m.name}`, [`${a.m.name} ${action === "remove" ? "removed a pending request" : "updated a pending request"}: ${shiftText(t.s, t.e)}.`]);
      await flash(action === "remove" ? "Shift removed." : "Shift updated.");
    } else {
      // An approved shift stays on the schedule until Angela approves the change or removal.
      await db`update read_shifts set status = 'canceled', decided_by = ${me}, decided_at = now()
        where replaces_id = ${s.id} and status = 'requested' and requested_by = ${me}`;
      await db`insert into read_shifts (member_id, starts_at, ends_at, status, action, replaces_id, note, requested_by)
        values (${s.member_id}, ${t.s}, ${t.e}, 'requested', ${action}, ${s.id}, ${note}, ${me})`;
      await notifyApprover(`Reads schedule ${action === "remove" ? "removal" : "change"} from ${a.m.name}`, [
        action === "remove" ? `${a.m.name} asked to remove ${shiftText(s.starts_at, s.ends_at)}.` : `${a.m.name} asked to change ${shiftText(s.starts_at, s.ends_at)} to ${shiftText(t.s, t.e)}.`,
        ...(note ? [`Note: ${note}`] : []), "The current shift stays on the schedule until you approve.",
      ]);
      await flash(action === "remove" ? "Removal requested. The shift stays on the schedule until Angela approves." : "Change requested. The current shift stays until Angela approves.");
    }
  } else if ((action === "approve" || action === "decline") && a.approver) {
    for (const id of fd.getAll("id").map(String).filter((x) => /^\d+$/.test(x))) {
      const [r] = await db<{ id: string; action: string; replaces_id: string | null; member_id: string; starts_at: Date; ends_at: Date; requested_by: string | null }[]>`
        select id, action, replaces_id, member_id, starts_at, ends_at, requested_by from read_shifts where id = ${id} and status = 'requested'`;
      if (!r) continue;
      if (r.requested_by && r.requested_by !== me) {
        const what = r.action === "remove" ? "removal of" : r.action === "change" ? "change to" : "shift";
        await emailMember(r.requested_by, `Reads ${action === "approve" ? "approved" : "declined"}`, [`Angela ${action === "approve" ? "approved" : "declined"} your ${what} ${shiftText(r.starts_at, r.ends_at)}.`]);
      }
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
    if (!a.approver) await notifyApprover(`Pay card change from ${a.m.name}`, [`${a.m.name} asked to ${hours > 0 ? "add" : "remove"} ${Math.abs(hours)} hours on ${date}.`, `Reason: ${reason}`, "It counts toward pay only after you approve it."]);
    await flash(a.approver ? "Hours changed." : "Hours change requested. It counts once Angela approves it.");
  } else if ((action === "adj-approve" || action === "adj-decline") && a.approver) {
    const ids = fd.getAll("id").map(String).filter((x) => /^\d+$/.test(x));
    if (ids.length) await db`update read_adjustments set status = ${action === "adj-approve" ? "approved" : "declined"}, decided_by = ${me}, decided_at = now()
      where id = any(${ids}) and status = 'requested'`;
    await flash(action === "adj-approve" ? "Hours approved." : "Hours change declined.");
  } else if (action === "swap-offer") {
    // Hand an approved shift to another read admin. It changes hands, without approval, when they accept.
    const id = num("id");
    const to = field(fd, "to", 40);
    const [s] = id ? await db<{ id: string; member_id: string; starts_at: Date; ends_at: Date; auto_night: boolean }[]>`
      select id, member_id, starts_at, ends_at, auto_night from read_shifts where id = ${id} and status = 'approved'` : [];
    const [target] = to ? await db<{ id: string; name: string }[]>`select id, name from members where id::text = ${to} and (read_role is not null or read_approver) and status <> 'disabled'` : [];
    if (!s || (!a.approver && s.member_id !== me)) { await flash("You can swap only your own approved shifts.", "error"); return go(req, back); }
    if (!target || target.id === s.member_id) { await flash("Choose another read admin.", "error"); return go(req, back); }
    const st = (d: Date) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });
    if (!a.approver && (s.auto_night || st(s.starts_at) < NIGHT_END || st(s.ends_at) > NIGHT_START || st(s.ends_at) <= st(s.starts_at))) {
      await flash("Night hours are assigned by Angela.", "error"); return go(req, back);
    }
    await db`update read_swaps set status = 'canceled', decided_at = now() where shift_id = ${s.id} and status = 'offered'`;
    await db`insert into read_swaps (shift_id, from_id, to_id, note) values (${s.id}, ${s.member_id}, ${target.id}, ${field(fd, "note", 300) || null})`;
    await emailMember(target.id, `${a.m.name} offered you a reads shift`, [
      `${a.m.name} would like you to take ${shiftText(s.starts_at, s.ends_at)}.`, ...(field(fd, "note", 300) ? [`Note: ${field(fd, "note", 300)}`] : []),
      "Accept or decline on the reads schedule. Once you accept, the shift is yours.",
    ], { href: absolute("/reads#swaps"), label: "Review the offer" });
    await flash(`Swap offered to ${target.name}. The shift moves to them when they accept.`);
  } else if (action === "swap-accept" || action === "swap-decline" || action === "swap-cancel") {
    const id = num("id");
    const [w] = id ? await db<{ id: string; shift_id: string; from_id: string; to_id: string; from_name: string; to_name: string }[]>`
      select w.id, w.shift_id, w.from_id, w.to_id, f.name as from_name, t.name as to_name from read_swaps w
      join members f on f.id = w.from_id join members t on t.id = w.to_id where w.id = ${id} and w.status = 'offered'` : [];
    if (!w || (action === "swap-cancel" ? w.from_id !== me && !a.approver : w.to_id !== me)) { await flash("That swap is no longer open.", "error"); return go(req, back); }
    const [s] = await db<{ id: string; member_id: string; starts_at: Date; ends_at: Date; status: string }[]>`select id, member_id, starts_at, ends_at, status from read_shifts where id = ${w.shift_id}`;
    if (action === "swap-accept") {
      if (!s || s.status !== "approved" || s.member_id !== w.from_id) {
        await db`update read_swaps set status = 'canceled', decided_at = now() where id = ${w.id}`;
        await flash("That shift has changed since it was offered, so the swap was canceled.", "error"); return go(req, back);
      }
      await db`update read_shifts set member_id = ${w.to_id}, auto_night = false, note = ${`Swapped from ${w.from_name}`} where id = ${s.id}`;
      await db`delete from read_notifications where shift_id = ${s.id}`;
      await db`update read_swaps set status = 'accepted', decided_at = now() where id = ${w.id}`;
      await emailMember(w.from_id, "Your reads swap was accepted", [`${w.to_name} accepted ${shiftText(s.starts_at, s.ends_at)}. It's off your schedule.`]);
      await notifyApprover("Reads shift swapped", [`${w.from_name} handed ${shiftText(s.starts_at, s.ends_at)} to ${w.to_name}, who accepted. No approval needed; this is for your records.`]);
      await flash("Swap accepted. The shift is yours.");
    } else {
      await db`update read_swaps set status = ${action === "swap-decline" ? "declined" : "canceled"}, decided_at = now() where id = ${w.id}`;
      if (action === "swap-decline" && s) await emailMember(w.from_id, "Your reads swap was declined", [`${w.to_name} declined ${shiftText(s.starts_at, s.ends_at)}. It's still yours.`]);
      await flash(action === "swap-decline" ? "Swap declined." : "Swap offer canceled.");
    }
  } else if (action === "team-add" && (a.approver || a.superadmin)) {
    const name = field(fd, "name", 120), email = field(fd, "email", 200).toLowerCase();
    const role = field(fd, "read_role", 10) === "super" ? "super" : "reader";
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { await flash("Enter a name and an email address.", "error"); return go(req, back); }
    const [existing] = await db<{ id: string; name: string; email: string; username: string; role: string; status: string }[]>`
      select id, name, email, username, role, status from members where lower(email) = ${email}`;
    if (existing) {
      // Giving read access to someone with another Labb account (dual access) is for the superadmin only.
      if (!a.superadmin && existing.role !== "reader") {
        await flash(`${existing.email} already has a Labb account. Only James can give it read access.`, "error");
        return go(req, back);
      }
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
  } else if (action === "team-invite" && (a.approver || a.superadmin)) {
    const id = field(fd, "id", 40);
    const [m] = await db<{ id: string; name: string; email: string; username: string; role: string }[]>`
      select id, name, email, username, role from members where id::text = ${id} and status = 'invited' and (read_role is not null or read_approver)`;
    if (m) {
      const r = await sendInvite(m);
      await flash(r.sent ? `Setup link emailed to ${m.email}.` : `The email didn't send. Share this setup link: ${r.link}`, r.sent ? "ok" : "error");
    }
  } else if (action === "team-role" && (a.approver || a.superadmin)) {
    const id = field(fd, "id", 40);
    const role = field(fd, "read_role", 10);
    const v = role === "super" ? "super" : role === "reader" ? "reader" : null;
    // The approver keeps access; removing a reads-only account disables it.
    const [t] = await db<{ role: string }[]>`select role from members where id::text = ${id}`;
    if (!t || (t.role !== "reader" && !a.superadmin)) { await flash("Only James can change read access for someone with a Labb admin account.", "error"); return go(req, back); }
    await db`update members set read_role = ${v} where id::text = ${id} and not read_approver`;
    if (!v) await db`update members set status = 'disabled', session_version = session_version + 1 where id::text = ${id} and role = 'reader'`;
    await flash(v ? "Read access updated." : "Removed from the read team.");
  }
  return go(req, back);
}
