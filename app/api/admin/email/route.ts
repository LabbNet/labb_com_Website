import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { getCampaign, isAudience, recipients, SEND_AUDIENCES, sendCampaign, sendTest } from "@/lib/broadcast";
import { field, go } from "@/lib/http";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_HTML = 900_000;

export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/email");
  if (!(await sameOrigin())) return go(req, "/admin/email");
  const fd = await req.formData();
  const action = field(fd, "action", 20);
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");
  const db = sql();

  if (action === "save") {
    const id = field(fd, "id", 40);
    const audience = field(fd, "audience", 20);
    const subject = field(fd, "subject", 200);
    const preheader = field(fd, "preheader", 200);
    const wrap = fd.get("wrap") === "on";
    let html = String(fd.get("html") ?? "");
    const file = fd.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_HTML || !/\.html?$/i.test(file.name)) {
        await flash("Upload an .html file under 900 KB.", "error");
        return go(req, id ? `/admin/email/${id}` : "/admin/email");
      }
      html = await file.text();
    }
    const back = id ? `/admin/email/${id}` : "/admin/email";
    const err = !isAudience(audience) || !SEND_AUDIENCES.includes(audience) ? "Choose who gets the email."
      : !subject ? "Enter a subject line."
      : !html.trim() ? "Paste the email HTML or upload an .html file."
      : html.length > MAX_HTML ? "The email HTML is too large (900 KB max). Host images online instead of embedding them."
      : null;
    if (err) {
      await flash(err, "error");
      return go(req, back);
    }
    if (id) {
      const c = await getCampaign(id);
      if (!c || c.status !== "draft") {
        await flash("Only drafts can be edited. Duplicate a sent email to reuse it.", "error");
        return go(req, back);
      }
      await db`update email_campaigns set audience = ${audience}, subject = ${subject}, preheader = ${preheader}, html = ${html}, wrap = ${wrap},
        updated_at = now() where id = ${id}`;
      await flash("Draft saved.");
      return go(req, `/admin/email/${id}`);
    }
    const [row] = await db<{ id: string }[]>`insert into email_campaigns (audience, subject, preheader, html, wrap, created_by)
      values (${audience}, ${subject}, ${preheader}, ${html}, ${wrap}, ${admin.id}) returning id`;
    await flash("Draft saved. Check the preview, send yourself a test, then send it.");
    return go(req, `/admin/email/${row.id}`);
  }

  const c = await getCampaign(field(fd, "id", 40));
  if (!c) return go(req, "/admin/email");
  const back = `/admin/email/${c.id}`;

  if (action === "test") {
    const to = field(fd, "to", 160).toLowerCase();
    if (!EMAIL.test(to)) {
      await flash("Enter a valid email address for the test.", "error");
      return go(req, back);
    }
    const ok = await sendTest(c, to);
    await flash(ok ? `Test sent to ${to}.` : "The test didn't send. Check the mail settings in Admin, Settings.", ok ? "ok" : "error");
    return go(req, back);
  }

  if (action === "duplicate") {
    const [row] = await db<{ id: string }[]>`insert into email_campaigns (audience, subject, preheader, html, wrap, created_by)
      values (${c.audience}, ${c.subject}, ${c.preheader}, ${c.html}, ${c.wrap}, ${admin.id}) returning id`;
    await flash("Copied into a new draft.");
    return go(req, `/admin/email/${row.id}`);
  }

  if (action === "delete") {
    if (c.status !== "draft") {
      await flash("Sent emails are kept as a record and can't be deleted.", "error");
      return go(req, back);
    }
    await db`delete from email_campaigns where id = ${c.id} and status = 'draft'`;
    await flash("Draft deleted.");
    return go(req, "/admin/email");
  }

  if (action === "send") {
    const list = await recipients(c.audience);
    if (fd.get("confirm") !== "on" || field(fd, "count", 10) !== String(list.length)) {
      await flash(`Tick the box to confirm sending to ${list.length} people. If the number changed, check it and try again.`, "error");
      return go(req, back);
    }
    if (!list.length) {
      await flash("There's no one to send to.", "error");
      return go(req, back);
    }
    // Claim the draft so a double click can't send twice.
    const claimed = await db`update email_campaigns set status = 'sending', recipients = ${list.length}, sent_by = ${admin.id}, updated_at = now()
      where id = ${c.id} and status = 'draft' returning id`;
    if (!claimed.length) {
      await flash("This email was already sent.", "error");
      return go(req, back);
    }
    const r = await sendCampaign(c);
    const status = r.sent === 0 ? "failed" : "sent";
    await db`update email_campaigns set status = ${status}, sent = ${r.sent}, failed = ${r.failed}, error = ${r.error ?? null},
      sent_at = now(), updated_at = now() where id = ${c.id}`;
    await flash(
      status === "sent" ? `Sent to ${r.sent} ${r.sent === 1 ? "person" : "people"}${r.failed ? `. ${r.failed} failed.` : "."}` : `Nothing was sent. ${r.error ?? ""}`,
      status === "sent" && !r.failed ? "ok" : "error",
    );
    return go(req, back);
  }

  return go(req, back);
}
