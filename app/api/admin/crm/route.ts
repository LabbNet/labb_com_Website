import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { isKey, isKind, isStage, keyHref, upsertPerson } from "@/lib/crm";

// Admin CRM actions on one person: log activity, complete tasks, set owner, stage, tags and follow-up.
export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/crm");
  if (!(await sameOrigin())) return go(req, "/admin/crm");
  const fd = await req.formData();
  const key = field(fd, "key", 260).toLowerCase();
  const action = field(fd, "action", 20);
  if (!isKey(key)) return go(req, "/admin/crm");
  const back = keyHref(key);
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");
  const db = sql();

  if (action === "log") {
    const kind = field(fd, "kind", 20);
    const body = field(fd, "body", 5000).trim();
    const due = field(fd, "due", 10);
    if (!isKind(kind) || !body) {
      await flash("Write something to log.", "error");
      return go(req, back);
    }
    await db`insert into crm_activities (key, kind, body, due_at, author_id)
      values (${key}, ${kind}, ${body}, ${kind === "task" && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null}, ${admin.id})`;
    await db`insert into crm_people (key) values (${key}) on conflict do nothing`;
    // Logging a call, email or meeting moves a brand new record to Contacted.
    if (kind === "call" || kind === "email" || kind === "meeting") await db`update crm_people set stage = 'contacted', updated_at = now() where key = ${key} and stage = 'new'`;
    await flash(`${kind === "task" ? "Task added" : "Logged"}.`);
  } else if (action === "done" || action === "reopen") {
    const id = field(fd, "id", 20);
    if (/^\d+$/.test(id)) await db`update crm_activities set done_at = ${action === "done" ? new Date() : null} where id = ${id} and key = ${key} and kind = 'task'`;
  } else if (action === "delete") {
    const id = field(fd, "id", 20);
    // Admins can remove their own entries only; everyone else's stay as the record.
    if (/^\d+$/.test(id)) await db`delete from crm_activities where id = ${id} and key = ${key} and author_id = ${admin.id}`;
  } else if (action === "update") {
    const owner = field(fd, "owner", 40);
    const stage = field(fd, "stage", 30);
    const follow = field(fd, "follow_up", 10);
    const tags = [...new Set(field(fd, "tags", 500).split(",").map((t) => t.trim().toLowerCase().replace(/[^a-z0-9 &/-]/g, "").slice(0, 30)).filter(Boolean))].slice(0, 15);
    const [valid] = owner ? await db`select 1 from members where id::text = ${owner} and role = 'admin'` : [true];
    await upsertPerson(key, {
      owner_id: owner && valid ? owner : null,
      stage: isStage(stage) ? stage : undefined,
      tags,
      follow_up_at: /^\d{4}-\d{2}-\d{2}$/.test(follow) ? follow : null,
    });
    await flash("Record updated.");
  }
  return go(req, back);
}
