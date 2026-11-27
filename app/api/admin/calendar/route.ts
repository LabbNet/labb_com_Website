import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { syncHostCalendar } from "@/lib/calsync";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { etToUtc } from "@/lib/meetings";

// Admin calendar: block time off day by day, and connect an Outlook or Gmail calendar. Admins edit their own; the superadmin anyone's.
export async function POST(req: Request) {
  const me = await currentMember();
  if (!me || me.role !== "admin") return go(req, "/admin-login");
  if (!(await sameOrigin())) return go(req, "/admin/calendar");
  const fd = await req.formData();
  const db = sql();
  const [{ superadmin }] = await db<{ superadmin: boolean }[]>`select superadmin from members where id = ${me.id}`;
  const whoIn = field(fd, "who", 40) || me.id;
  const who = whoIn !== me.id && !superadmin ? me.id : whoIn;
  const [target] = await db<{ id: string }[]>`select id from members where id = ${/^[0-9a-f-]{36}$/i.test(who) ? who : me.id} and role = 'admin'`;
  if (!target) return go(req, "/admin/calendar");
  const week = field(fd, "week", 10);
  const back = `/admin/calendar?${new URLSearchParams({ ...(target.id !== me.id ? { who: target.id } : {}), ...(/^\d{4}-\d{2}-\d{2}$/.test(week) ? { week } : {}) })}`;
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");
  const action = field(fd, "action", 20);

  if (action === "block") {
    const date = field(fd, "date", 10);
    const to = field(fd, "to", 10) || date;
    const allDay = fd.get("all_day") === "1";
    const s = /^(\d{1,2}):(\d{2})$/.exec(field(fd, "start", 5)), e = /^(\d{1,2}):(\d{2})$/.exec(field(fd, "end", 5));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < date) { await flash("Choose the day (or days) to block.", "error"); return go(req, back); }
    const sm = allDay ? 0 : s ? +s[1] * 60 + +s[2] : -1, em = allDay ? 1440 : e ? +e[1] * 60 + +e[2] : -1;
    if (sm < 0 || em <= sm) { await flash("Choose a start and end time, or check All day.", "error"); return go(req, back); }
    const note = field(fd, "note", 200) || null;
    let n = 0;
    for (let d = date; d <= to && n < 62; n++) {
      await db`insert into host_blocks (host_id, starts_at, ends_at, note, created_by) values (${target.id}, ${etToUtc(d, sm)}, ${etToUtc(d, em)}, ${note}, ${me.id})`;
      const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + 1); d = x.toISOString().slice(0, 10);
    }
    await flash(`Blocked ${n === 1 ? "that time" : `${n} days`}. Leads can't book it.`);
    return go(req, back);
  }
  if (action === "unblock") {
    await db`delete from host_blocks where id = ${field(fd, "block", 20).replace(/\D/g, "") || "0"} and host_id = ${target.id}`;
    await flash("Block removed. That time is open again.");
    return go(req, back);
  }
  if (action === "ics") {
    const ics = field(fd, "busy_ics_url", 1000).replace(/^webcals?:\/\//i, "https://");
    if (ics && !/^https:\/\/[^\s<>"]+$/.test(ics)) { await flash("Paste the calendar's secret ICS address. It starts with https:// (or webcal://).", "error"); return go(req, back); }
    await db`update members set busy_ics_url = ${ics || null} where id = ${target.id}`;
    const r = await syncHostCalendar(target.id);
    await flash(!ics ? "Calendar disconnected." : r.ok ? `Calendar connected: ${r.count} busy ${r.count === 1 ? "time" : "times"} in the next 60 days are blocked.` : `The calendar didn't sync: ${r.error}`, !ics || r.ok ? "ok" : "error");
    return go(req, back);
  }
  if (action === "sync") {
    const r = await syncHostCalendar(target.id);
    await flash(r.ok ? `Synced: ${r.count} busy ${r.count === 1 ? "time" : "times"} blocked.` : `The calendar didn't sync: ${r.error}`, r.ok ? "ok" : "error");
    return go(req, back);
  }
  return go(req, back);
}
