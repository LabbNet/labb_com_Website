import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";

// Save a team member's weekly meeting hours and video room link. Admins edit their own; the superadmin can edit anyone's.
export async function POST(req: Request) {
  const me = await currentMember();
  if (!me || me.role !== "admin") return go(req, "/admin-login");
  if (!(await sameOrigin())) return go(req, "/admin/meetings");
  const fd = await req.formData();
  const who = field(fd, "who", 40) || me.id;
  const db = sql();
  const [{ superadmin }] = await db<{ superadmin: boolean }[]>`select superadmin from members where id = ${me.id}`;
  if (who !== me.id && !superadmin) return go(req, "/admin/meetings");
  const [target] = await db<{ id: string }[]>`select id from members where id = ${/^[0-9a-f-]{36}$/i.test(who) ? who : me.id} and role = 'admin'`;
  if (!target) return go(req, "/admin/meetings");
  const back = `/admin/meetings${who !== me.id ? `?who=${who}` : ""}#hours`;
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");

  const rows: { dow: number; s: number; e: number }[] = [];
  for (let d = 0; d < 7; d++) {
    const s = field(fd, `s${d}`, 5), e = field(fd, `e${d}`, 5);
    if (!s) continue;
    const sn = Number(s), en = Number(e);
    if (!Number.isInteger(sn) || !Number.isInteger(en) || en <= sn || sn < 0 || en > 1440) {
      await flash("Each day you're available needs an end time after its start time.", "error");
      return go(req, back);
    }
    rows.push({ dow: d, s: sn, e: en });
  }
  const url = field(fd, "meeting_url", 300);
  if (url && !/^https:\/\/[^\s<>"]+$/.test(url)) {
    await flash("The video meeting link must start with https://", "error");
    return go(req, back);
  }
  await db.begin(async (tx) => {
    await tx`delete from meeting_hours where member_id = ${target.id}`;
    for (const r of rows) await tx`insert into meeting_hours (member_id, dow, start_min, end_min) values (${target.id}, ${r.dow}, ${r.s}, ${r.e})`;
    await tx`update members set meeting_url = ${url || null} where id = ${target.id}`;
  });
  await flash(rows.length ? "Meeting hours saved." : "Meeting hours cleared. Prospects can't book with this person until hours are set.");
  return go(req, back);
}
