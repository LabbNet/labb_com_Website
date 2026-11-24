import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { draftAnswer, emailAnswer, newAskToken, uniqueSlug, type AskRow } from "@/lib/ask";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { logLeadEvent } from "@/lib/leads";

// Review actions for Ask an Expert (Labb admins).
export async function POST(req: Request) {
  const me = await currentMember();
  if (!me || me.role !== "admin") return go(req, "/admin-login");
  if (!(await sameOrigin())) return go(req, "/admin/ask");
  const fd = await req.formData();
  const action = field(fd, "action", 20);
  const back = field(fd, "back", 120).startsWith("/admin/ask") ? field(fd, "back", 120) : "/admin/ask";
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");
  const db = sql();
  const clean = (s: string) => s.replace(/\r\n/g, "\n").replace(/—/g, ", ").trim();

  if (action === "add") {
    const question = field(fd, "question", 1000).replace(/\s+/g, " ").trim();
    const answer = clean(String(fd.get("answer") ?? "").slice(0, 8000));
    if (question.length < 8 || answer.length < 10) { await flash("Add a question and an answer.", "error"); return go(req, back); }
    const [q] = await db<{ id: string }[]>`insert into ask_questions (token, question, status, answer, draft_source, reviewed_by, reviewed_at, published)
      values (${newAskToken()}, ${question}, 'approved', ${answer}, 'admin', ${me.id}, now(), ${fd.get("publish") === "1"}) returning id`;
    await db`update ask_questions set slug = ${await uniqueSlug(question, q.id)} where id = ${q.id}`;
    await flash("Added. Labb will use this answer for the same question from now on.");
    return go(req, back);
  }

  const id = field(fd, "id", 20);
  const [q] = /^\d+$/.test(id) ? await db<AskRow[]>`select * from ask_questions where id = ${id}` : [];
  if (!q) return go(req, back);

  if (action === "save" || action === "approve" || action === "update") {
    const answer = clean(String(fd.get("answer") ?? "").slice(0, 8000));
    const question = field(fd, "question", 1000).replace(/\s+/g, " ").trim() || q.question;
    const publish = fd.get("publish") === "1";
    if (action === "save") {
      await db`update ask_questions set draft = ${answer || null}, question = ${question}, updated_at = now() where id = ${id}`;
      await flash("Draft saved.");
      return go(req, `${back}#q-${id}`);
    }
    if (answer.length < 10) { await flash("Write the answer before approving.", "error"); return go(req, `${back}#q-${id}`); }
    const slug = q.slug || (await uniqueSlug(question, id));
    const [row] = await db<AskRow[]>`update ask_questions set question = ${question}, answer = ${answer}, status = 'approved', published = ${publish}, slug = ${slug},
      reviewed_by = coalesce(reviewed_by, ${me.id}), reviewed_at = coalesce(reviewed_at, now()), updated_at = now() where id = ${id} returning *`;
    let sent = false;
    if (action === "approve" && row.email && !row.emailed_at) {
      sent = await emailAnswer(row);
      if (sent) await db`update ask_questions set emailed_at = now() where id = ${id}`;
      if (row.lead_id) await logLeadEvent(row.lead_id, "emailed", `To ${row.email}. Subject: Ask an Expert answer\n\n${row.question}\n\n${answer}`.slice(0, 4000), { id: me.id, name: me.name });
    }
    await flash(action === "update" ? "Answer updated." : `Approved${publish ? " and published" : " (kept private)"}.${row.email ? (sent ? ` Emailed to ${row.email}.` : row.emailed_at ? "" : " The email didn't send; check the email settings.") : ""} Future matching questions get this answer right away.`, action === "approve" && row.email && !sent && !row.emailed_at ? "error" : "ok");
    return go(req, `${back}#q-${id}`);
  }
  if (action === "redraft") {
    await db`update ask_questions set draft = null, draft_source = 'working' where id = ${id} and status = 'pending'`;
    await draftAnswer(id);
    await flash("New draft ready.");
    return go(req, `${back}#q-${id}`);
  }
  if (action === "reject") {
    await db`update ask_questions set status = 'rejected', published = false, reviewed_by = ${me.id}, reviewed_at = now(), updated_at = now() where id = ${id}`;
    await flash("Marked as not answered (spam or off-topic). Nothing was sent.");
    return go(req, back);
  }
  if (action === "unpublish" || action === "publish") {
    await db`update ask_questions set published = ${action === "publish"}, updated_at = now() where id = ${id}`;
    await flash(action === "publish" ? "Published on labb.com." : "Taken off labb.com. It's still used to answer matching questions.");
    return go(req, `${back}#q-${id}`);
  }
  if (action === "delete") {
    await db`update ask_questions set matched_id = null where matched_id = ${id}`;
    await db`delete from ask_questions where id = ${id}`;
    await flash("Deleted.");
    return go(req, back);
  }
  return go(req, back);
}
