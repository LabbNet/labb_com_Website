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
    const to = field(fd, "to", 20);
    const target = isList(to) ? to : null;
    const r = await importContacts(await file.text(), src, `${file.name.slice(0, 120)} (${new Date().toISOString().slice(0, 10)})`, target, admin.id);
    if ("error" in r) await flash(r.error ?? "Import failed.", "error");
    else {
      const parts = [
        `${r.added} new ${r.added === 1 ? "contact" : "contacts"} ${target ? `added to ${LIST_LABELS[target]}` : "added to Pending"}`,
        r.updated ? `${r.updated} already on file, not duplicated${target && r.listed > r.added ? ` (${r.listed - r.added} of them moved from Pending to ${LIST_LABELS[target]})` : ""}` : "",
        r.otherList ? `${r.otherList} already on another list, left as is` : "",
        r.ignored ? `${r.ignored} previously set aside, left as is` : "",
        r.leads ? `${r.leads} also match website leads (they won't get duplicate emails)` : "",
        r.invalid ? `${r.invalid} rows skipped without a valid email` : "",
        r.dupes ? `${r.dupes} duplicates in the file` : "",
      ].filter(Boolean);
      await flash(`${sourceLabel(src)} import: ${parts.join("; ")}.`);
    }
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
  } else if (action === "do-not-send") {
    // Block these addresses from every Labb marketing email, and stop any guidebook series in progress.
    const t = await target();
    const rows = t.length ? await db<{ email: string }[]>`select distinct lower(email) as email from contact_imports where id = any(${t}) and email is not null` : [];
    const extra = field(fd, "email", 200).toLowerCase();
    const emails = [...new Set([...rows.map((r) => r.email), ...(extra.includes("@") ? [extra] : [])])];
    for (const e of emails) {
      await db`insert into email_suppressions (email, audience, added_by) values (${e}, 'all', ${admin.id}) on conflict do nothing`;
    }
    if (emails.length) {
      const runs = await db<{ id: string }[]>`update sequence_runs set status = 'unsubscribed', updated_at = now() where lower(email) = any(${emails}) and status = 'active' returning id`;
      if (runs.length) await db`update sequence_sends set status = 'canceled' where status = 'queued' and run_id = any(${runs.map((r) => r.id)})`;
    }
    await flash(emails.length ? `${emails.length} ${emails.length === 1 ? "address" : "addresses"} added to Do not send. They won't get any Labb marketing email.` : "Nothing selected has an email address.", emails.length ? "ok" : "error");
  } else if (action === "allow") {
    // Only addresses an admin blocked can be allowed again; people who unsubscribed stay unsubscribed.
    const emails = fd.getAll("email").map(String).map((e) => e.toLowerCase()).filter((e) => e.includes("@")).slice(0, 2000);
    const r = emails.length ? await db`delete from email_suppressions where audience = 'all' and added_by is not null and email = any(${emails})` : { count: 0 };
    await flash(`${r.count} ${r.count === 1 ? "address" : "addresses"} removed from Do not send.`);
  } else if (action === "pending") {
    if (ids.length) await db`update contact_imports set status = 'pending', list = null, assigned_by = null, assigned_at = null, updated_at = now() where id = any(${ids})`;
    await flash(`${ids.length} moved back to Pending.`);
  }
  return go(req, back);
}
