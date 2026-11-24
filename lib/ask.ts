import "server-only";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { drugsIn, kitCoverage, kitTable, searchKb, type Hit } from "@/lib/kb";
import { badgeLabel, publishedKits } from "@/lib/kits";
import { emailLayout, esc, sendMail } from "@/lib/mail";
import { notifyAddresses } from "@/lib/leads";
import { absoluteUrl } from "@/lib/site";

// Ask an Expert. A question is answered on the spot only when it matches an answer a Labb admin already approved.
// Everything else gets a draft (AI when ANTHROPIC_API_KEY is set, otherwise kit data or guidebook passages),
// waits for a Labb admin, and is emailed to the person once approved.

export type AskRow = {
  id: string; token: string; question: string; name: string | null; email: string | null; company: string | null; lead_id: string | null;
  status: "pending" | "approved" | "matched" | "rejected"; draft: string | null; draft_source: string | null; answer: string | null;
  sources: Source[]; confidence: string | null; matched_id: string | null; slug: string | null; published: boolean;
  reviewed_by: string | null; reviewed_at: Date | null; emailed_at: Date | null; views: number; created_at: Date; updated_at: Date;
};
export type Source = { title: string; url: string | null; heading?: string | null };

export const newAskToken = () => randomBytes(15).toString("base64url");

export function slugify(q: string) {
  return q.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").slice(0, 12).join("-").slice(0, 90) || "question";
}
export async function uniqueSlug(q: string, id: string) {
  const base = slugify(q);
  const [taken] = await sql()<{ id: string }[]>`select id from ask_questions where slug = ${base} and id <> ${id}`;
  return taken ? `${base}-${id}` : base;
}

// An approved answer to the same question, close enough to show right away.
export async function findApproved(q: string): Promise<AskRow | null> {
  const [hit] = await sql()<(AskRow & { score: number })[]>`
    select *, similarity(lower(question), lower(${q})) as score from ask_questions
    where status = 'approved' and published and answer is not null and lower(question) % lower(${q})
    order by score desc limit 1`.catch(() => [] as (AskRow & { score: number })[]);
  return hit && hit.score >= 0.62 ? hit : null;
}

export async function relatedApproved(q: string, exceptId?: string, limit = 4) {
  return sql()<{ id: string; question: string; slug: string }[]>`
    select id, question, slug from ask_questions
    where status = 'approved' and published and slug is not null and id <> ${exceptId ?? "0"}
      and (lower(question) % lower(${q}) or tsv @@ plainto_tsquery('english', ${q}))
    order by similarity(lower(question), lower(${q})) desc limit ${limit}`.catch(() => []);
}

// ---- Drafting ----
function kitAnswer(codes: string[], question: string): string | null {
  if (!codes.length) return null;
  const specimen = /\b(oral|saliva|swab|mouth)\b/i.test(question) ? "Oral fluid" : /\b(urine|cup)\b/i.test(question) ? "Urine" : null;
  const { full, partial, none } = kitCoverage(codes, specimen);
  const label = (c: string) => publishedKits.flatMap((k) => k.drugs).find((d) => d.code === c)?.name || c;
  const names = codes.map((c) => `${label(c)} (${c})`).join(", ").replace(/, ([^,]*)$/, " and $1");
  const line = (k: (typeof full)[number]) => `- ${k.name} (${k.code}), ${k.specimen.toLowerCase()}, ${badgeLabel[k.badge]}: ${codes.filter((c) => k.drugs.some((d) => d.code === c)).map((c) => `${c} ${k.drugs.find((d) => d.code === c)!.cutoff} ng/mL`).join(", ")}. ${absoluteUrl(`/test-kits/${k.slug}`)}`;
  const parts: string[] = [];
  const which = specimen ? `${specimen.toLowerCase()} ` : "";
  if (full.length) parts.push(`These Labb ${which}kits test for ${codes.length > 1 ? "all of " : ""}${names}:\n${full.map(line).join("\n")}`);
  else parts.push(`No single Labb ${which}kit tests for ${codes.length > 1 ? "all of " : ""}${names} today.`);
  if (!full.length && partial.length) parts.push(`Closest matches:\n${partial.slice(0, 4).map((r) => `- ${r.kit.name} (${r.kit.code}) covers ${r.covered.join(", ")}. ${absoluteUrl(`/test-kits/${r.kit.slug}`)}`).join("\n")}`);
  if (none.length) parts.push(`${none.map(label).join(", ")} ${none.length === 1 ? "is" : "are"} not on any current Labb rapid kit. A laboratory test can usually add ${none.length === 1 ? "it" : "them"}; contact Labb for options.`);
  parts.push("Cutoffs are in ng/mL. A non-negative rapid screen is preliminary until a laboratory confirms it.");
  return parts.join("\n\n");
}

const RULES = `You answer questions for Labb (Ramsey Diagnostics Corporation d/b/a Labb), a US drug testing company, on its "Ask an Expert" page.
Use only the reference material provided. If it does not answer the question, reply with exactly UNKNOWN.
Write plain, friendly, accurate text for employers, clinics and testing professionals. Keep it under 220 words unless a list of kits or steps is needed.
Never use em dashes. Do not name laboratories, lab partners or background check providers (citing a published industry statistic by its source is fine).
Do not mention CJIS. Do not say whether a person reviews or reads test results. Do not give prices unless the material states them; suggest contacting Labb for a quote.
Do not give legal advice; say the guidebooks describe general rules and the reader should confirm with counsel for their state when it matters.
When kits fit the question, name them with their code. Never invent kits, drugs or cutoffs.
Return JSON only: {"answer": "...", "sources": [numbers of the passages you used], "confidence": "high" | "medium" | "low"}.`;

async function aiDraft(question: string, hits: Hit[], approved: { question: string; answer: string }[]) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const material = [
    `LABB TEST KITS (code, specimen, label, page: drug code, name, cutoff ng/mL)\n${kitTable()}`,
    approved.length ? `APPROVED ANSWERS FROM LABB\n${approved.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}` : "",
    `GUIDEBOOK PASSAGES\n${hits.map((h, i) => `[${i + 1}] ${h.source_title}${h.heading ? `, ${h.heading}` : ""}\n${h.body}`).join("\n\n")}`,
  ].filter(Boolean).join("\n\n---\n\n");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ASK_MODEL || "claude-sonnet-5-5",
        max_tokens: 1200,
        system: RULES,
        messages: [{ role: "user", content: `REFERENCE MATERIAL\n\n${material}\n\n---\n\nQUESTION\n${question}` }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.error(`[ask] model request returned ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { answer?: string; sources?: number[]; confidence?: string };
    const answer = String(json.answer || "").replace(/—/g, ", ").trim();
    if (!answer || /^UNKNOWN$/i.test(answer)) return { answer: null, sources: [] as Source[], confidence: "unknown" };
    const used = (json.sources || []).map((n) => hits[n - 1]).filter(Boolean);
    return { answer, sources: dedupe(used.map(toSource)), confidence: json.confidence || "medium" };
  } catch (e) {
    console.error("[ask] model request failed", e);
    return null;
  }
}

const toSource = (h: Hit): Source => ({ title: h.source_title, url: h.url, heading: h.heading });
const dedupe = (s: Source[]) => s.filter((x, i) => s.findIndex((y) => y.title === x.title && y.heading === x.heading) === i);

// Build (or rebuild) the draft for a pending question.
export async function draftAnswer(id: string) {
  const db = sql();
  const [q] = await db<AskRow[]>`select * from ask_questions where id = ${id}`;
  if (!q) return;
  const codes = drugsIn(q.question);
  const kitQ = codes.length > 0 && /\b(kits?|panels?|cups?|swabs?|cutoffs?|detects?|covers?|includes?|available|offer|carry|sell|which tests?|what tests?|do you have)\b/i.test(q.question);
  const hits = await searchKb(q.question, 8);
  const approved = await db<{ question: string; answer: string }[]>`
    select question, answer from ask_questions where status = 'approved' and answer is not null and lower(question) % lower(${q.question})
    order by similarity(lower(question), lower(${q.question})) desc limit 3`.catch(() => []);

  let draft: string | null = null, source = "none", sources: Source[] = [], confidence = "unknown";
  const ai = await aiDraft(q.question, hits, approved);
  if (ai?.answer) {
    draft = ai.answer; source = "ai"; sources = ai.sources; confidence = ai.confidence;
  } else if (kitQ) {
    draft = kitAnswer(codes, q.question); source = "kits"; sources = [{ title: "Labb test kits", url: "/test-kits" }]; confidence = "high";
  } else if (!ai && hits.length) {
    // No AI: offer the best guidebook passages as a starting point for the admin.
    draft = hits.slice(0, 2).map((h) => `${h.body.slice(0, 700)}${h.body.length > 700 ? "..." : ""}`).join("\n\n");
    source = "passages"; sources = dedupe(hits.slice(0, 4).map(toSource)); confidence = "low";
  } else if (ai && !ai.answer) {
    sources = dedupe(hits.slice(0, 4).map(toSource));
  }
  await db`update ask_questions set draft = ${draft}, draft_source = ${source}, sources = ${db.json(sources as never)}, confidence = ${confidence}, updated_at = now()
    where id = ${id} and status = 'pending'`;
}

// ---- Emails ----
export async function emailTeamNewQuestion(q: { id: string; question: string; name: string | null; email: string | null; company: string | null }) {
  const to = await notifyAddresses();
  const link = absoluteUrl("/admin/ask");
  await sendMail(to, `Ask an Expert: new question to review`,
    emailLayout("New question to review", `<p><strong>${esc(q.question)}</strong></p><p>${esc([q.name, q.company, q.email].filter(Boolean).join(" · "))}</p><p>A draft answer is being prepared. Review, edit and approve it before it goes out.</p>`, { href: link, label: "Review the question" }),
    `New Ask an Expert question:\n\n${q.question}\n\n${[q.name, q.company, q.email].filter(Boolean).join(" · ")}\n\nReview: ${link}`, { replyTo: q.email || undefined });
}

export async function emailAnswer(q: AskRow) {
  if (!q.email || !q.answer) return false;
  const page = q.published && q.slug ? absoluteUrl(`/ask/${q.slug}`) : absoluteUrl(`/ask/status/${q.token}`);
  const html = emailLayout("Your question, answered",
    `<p>Hi ${esc(q.name?.split(" ")[0] || "there")},</p><p>Thanks for asking Labb. Here's the answer from our team.</p>
     <p style="margin:18px 0 6px"><strong>${esc(q.question)}</strong></p>
     <div style="white-space:pre-wrap;border-left:3px solid #CF743C;padding:2px 0 2px 14px">${esc(q.answer)}</div>
     <p style="margin-top:18px">Have a follow-up? Reply to this email or <a href="${absoluteUrl("/schedule")}" style="color:#CF743C">book a call with Labb</a>.</p>`,
    { href: page, label: "View the answer online" });
  const text = `Hi ${q.name?.split(" ")[0] || "there"},\n\nThanks for asking Labb. Here's the answer from our team.\n\n${q.question}\n\n${q.answer}\n\nView online: ${page}\nBook a call: ${absoluteUrl("/schedule")}`;
  return sendMail(q.email, `Your question for Labb: ${q.question.slice(0, 70)}${q.question.length > 70 ? "..." : ""}`, html, text, { replyTo: "info@labb.com" });
}
