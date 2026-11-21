import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go, safePath } from "@/lib/http";
import { importContacts, isList, isSource, LIST_LABELS, sourceLabel } from "@/lib/contacts";

// Admin: upload opt-in contacts and sort them onto newsletter lists.
export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/contacts");
  if (!(await sameOrigin())) return go(req, "/admin/contacts");
  const fd = await req.formData();
  const action = field(fd, "action", 20);
  const back = safePath(field(fd, "back", 400), "/admin/contacts");
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");
  const db = sql();

  if (action === "upload") {
    const file = fd.get("file");
    const source = field(fd, "source", 40);
    if (!(file instanceof File) || !file.size) {
      await flash("Choose a CSV file.", "error");
      return go(req, "/admin/contacts");
    }
    if (file.size > 20 * 1024 * 1024) {
      await flash("That file is over 20 MB. Split it and upload the parts.", "error");
      return go(req, "/admin/contacts");
    }
    const src = isSource(source) ? source : "other";
    const r = await importContacts(await file.text(), src, `${file.name.slice(0, 120)} (${new Date().toISOString().slice(0, 10)})`);
    if ("error" in r) await flash(r.error ?? "Import failed.", "error");
    else await flash(`${sourceLabel(src)} import: ${r.added} new contacts added to Pending${r.updated ? `, ${r.updated} already on file` : ""}${r.invalid ? `, ${r.invalid} rows skipped without a valid email` : ""}${r.dupes ? `, ${r.dupes} duplicates in the file` : ""}.`);
    return go(req, "/admin/contacts");
  }

  const list = field(fd, "list", 20);
  const ids = fd.getAll("id").map(String).filter((x) => /^\d+$/.test(x)).slice(0, 5000);
  const company = fd.has("company") ? field(fd, "company", 300) : null;

  // Which rows: a whole company's pending contacts, or chosen contacts.
  const target = async () => {
    if (company !== null) {
      const rows = await db<{ id: string }[]>`select id from contact_imports where status = 'pending' and lower(trim(coalesce(company, ''))) = ${company}`;
      return rows.map((r) => r.id);
    }
    return ids;
  };

  if (action === "assign") {
    if (!isList(list)) {
      await flash("Choose a list.", "error");
      return go(req, back);
    }
    const t = await target();
    if (t.length) await db`update contact_imports set status = 'assigned', list = ${list}, assigned_by = ${admin.id}, assigned_at = now(), updated_at = now() where id = any(${t})`;
    await flash(`${t.length} ${t.length === 1 ? "contact" : "contacts"} added to ${LIST_LABELS[list]}.`);
  } else if (action === "ignore") {
    const t = await target();
    if (t.length) await db`update contact_imports set status = 'ignored', list = null, assigned_by = ${admin.id}, assigned_at = now(), updated_at = now() where id = any(${t})`;
    await flash(`${t.length} ${t.length === 1 ? "contact" : "contacts"} set aside. They won't get email.`);
  } else if (action === "pending") {
    if (ids.length) await db`update contact_imports set status = 'pending', list = null, assigned_by = null, assigned_at = null, updated_at = now() where id = any(${ids})`;
    await flash(`${ids.length} moved back to Pending.`);
  }
  return go(req, back);
}
