import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/auth";
import { draftAnswer, emailTeamNewQuestion, findApproved, newAskToken } from "@/lib/ask";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { logLeadEvent } from "@/lib/leads";
import { linkVisitor } from "@/lib/visitors";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

// A question from the Ask an Expert page.
export async function POST(req: Request) {
  const fd = await req.formData();
  if (!(await sameOrigin())) return go(req, "/ask");
  if (field(fd, "website", 200)) return go(req, "/ask?m=sent"); // bot trap
  const question = field(fd, "question", 1000).replace(/\s+/g, " ").trim();
  const name = field(fd, "name", 120), email = field(fd, "email", 200).toLowerCase(), company = field(fd, "company", 160);
  if (question.length < 8) return go(req, "/ask?m=short");
  const db = sql();
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ipHash = ip ? createHash("sha256").update(`ask:${ip}:${process.env.SESSION_SECRET || ""}`).digest("hex").slice(0, 32) : null;
  if (ipHash) {
    const [{ n }] = await db<{ n: number }[]>`select count(*)::int as n from ask_questions where ip_hash = ${ipHash} and created_at > now() - interval '1 hour'`;
    if (n >= 6) return go(req, "/ask?m=slow");
  }

  // Already answered and approved: show it now. No review needed.
  const hit = await findApproved(question);
  if (hit?.slug) {
    await db`insert into ask_questions (token, question, name, email, company, status, answer, matched_id, ip_hash)
      values (${newAskToken()}, ${question}, ${name || null}, ${EMAIL.test(email) ? email : null}, ${company || null}, 'matched', ${hit.answer}, ${hit.id}, ${ipHash})`;
    return go(req, `/ask/${hit.slug}?asked=1`);
  }

  if (!EMAIL.test(email)) return go(req, `/ask?m=email&q=${encodeURIComponent(question.slice(0, 300))}`);

  // New question: keep it as a lead, draft an answer, and hold it for a Labb admin.
  let [lead] = await db<{ id: string }[]>`select id from leads where lower(email) = ${email} and owner = 'labb' and not archived order by created_at desc limit 1`;
  if (!lead) {
    const [first, ...rest] = name.split(" ");
    [lead] = await db<{ id: string }[]>`
      insert into leads (type, segment, first_name, last_name, email, company, message, page, data, notified)
      values ('ask-expert', 'other', ${first || null}, ${rest.join(" ") || null}, ${email}, ${company || null}, ${question}, '/ask', ${db.json({})}, true)
      returning id`;
  }
  const token = newAskToken();
  const [q] = await db<{ id: string }[]>`
    insert into ask_questions (token, question, name, email, company, lead_id, ip_hash)
    values (${token}, ${question}, ${name || null}, ${email}, ${company || null}, ${lead.id}, ${ipHash}) returning id`;
  await logLeadEvent(lead.id, "asked", `Asked an expert: ${question}`, null);
  await linkVisitor((await cookies()).get("labb_v")?.value, email, lead.id, "form").catch(() => {});
  void (async () => {
    await draftAnswer(q.id).catch((e) => console.error("[ask] draft failed", e));
    await emailTeamNewQuestion({ id: q.id, question, name, email, company }).catch(() => {});
  })();
  return go(req, `/ask/status/${token}`);
}
