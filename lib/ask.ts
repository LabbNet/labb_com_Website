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
  status: "pending" | "approved" | "auto" | "matched" | "rejected"; draft: string | null; draft_source: string | null; answer: string | null;
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
    where status in ('approved', 'auto') and answer is not null and lower(question) % lower(${q})
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
  const line = (k: (typeof full)[number]) => `- ${k.name} (${k.specimen.toLowerCase()}, ${badgeLabel[k.badge]}). Cutoffs: ${codes.filter((c) => k.drugs.some((d) => d.code === c)).map((c) => `${label(c)} ${k.drugs.find((d) => d.code === c)!.cutoff} ng/mL`).join(", ")}. ${absoluteUrl(`/test-kits/${k.slug}`)}`;
  const parts: string[] = [];
  const which = specimen ? `${specimen.toLowerCase()} ` : "";
  if (full.length) parts.push(`These Labb ${which}kits test for ${codes.length > 1 ? "all of " : ""}${names}:\n${full.map(line).join("\n")}`);
  else parts.push(`No single Labb ${which}kit tests for ${codes.length > 1 ? "all of " : ""}${names} today.`);
  if (!full.length && partial.length) parts.push(`Closest matches:\n${partial.slice(0, 4).map((r) => `- ${r.kit.name} covers ${r.covered.map(label).join(", ")}. ${absoluteUrl(`/test-kits/${r.kit.slug}`)}`).join("\n")}`);
  if (none.length) parts.push(`${none.map(label).join(", ")} ${none.length === 1 ? "is" : "are"} not on any current Labb rapid kit. A laboratory test can usually add ${none.length === 1 ? "it" : "them"}; contact Labb for options.`);
  parts.push("A non-negative rapid screen is preliminary until a laboratory confirms it.");
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
export async function draftAnswer(id: string): Promise<{ source: string; confidence: string } | undefined> {
  const db = sql();
  const [q] = await db<AskRow[]>`select * from ask_questions where id = ${id}`;
  if (!q) return;
  const codes = drugsIn(q.question);
  const kitQ = codes.length > 0 && /\b(kits?|panels?|cups?|swabs?|cutoffs?|detects?|covers?|includes?|available|offer|carry|sell|which tests?|what tests?|do you have)\b/i.test(q.question);
  const hits = await searchKb(q.question, 8);
  const approved = await db<{ question: string; answer: string }[]>`
    select question, answer from ask_questions where status in ('approved', 'auto') and answer is not null and lower(question) % lower(${q.question})
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
  return { source, confidence };
}

// A draft that came straight from the guidebooks, labb.com or the kit data can go out without review.
export const answersOnItsOwn = (r?: { source: string; confidence: string }) =>
  !!r && (r.source === "kits" || (r.source === "ai" && (r.confidence === "high" || r.confidence === "medium")));

// ---- Emails ----
export async function emailTeamNewQuestion(q: { id: string; question: string; name: string | null; email: string | null; company: string | null }) {
  const to = await notifyAddresses();
  const link = absoluteUrl("/admin/ask");
  await sendMail(to, `Ask an Expert: new question to review`,
    emailLayout("New question to review", `<p><strong>${esc(q.question)}</strong></p><p>${esc([q.name, q.company, q.email].filter(Boolean).join(" · "))}</p><p>A draft answer is being prepared. Review, edit and approve it before it goes out.</p>`, { href: link, label: "Review the question" }),
    `New Ask an Expert question:\n\n${q.question}\n\n${[q.name, q.company, q.email].filter(Boolean).join(" · ")}\n\nReview: ${link}`, { replyTo: q.email || undefined });
}

// Turns an answer into clean email HTML: paragraphs, bulleted lists, and short link labels instead of raw URLs.
function linkHtml(text: string) {
  return esc(text).replace(/(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, (url) => {
    const kit = url.match(/labb\.com\/test-kits\/[a-z0-9-]+/);
    const path = url.replace(/^https?:\/\/(www\.)?/, "");
    const label = kit ? "View kit" : path.length > 48 ? `${path.slice(0, 45)}...` : path;
    return `<a href="${url}" style="color:#CF743C;font-weight:bold;text-decoration:none">${label}</a>`;
  });
}
export function answerHtml(text: string) {
  const P = "margin:0 0 14px;font-size:15px;line-height:1.6;color:#404951";
  return text.split(/\n{2,}/).map((block) => {
    const lines = block.split("\n").filter((l) => l.trim());
    const items = lines.filter((l) => /^\s*[-•*]\s+/.test(l));
    const intro = lines.filter((l) => !/^\s*[-•*]\s+/.test(l));
    let html = intro.length ? `<p style="${P}">${intro.map(linkHtml).join("<br>")}</p>` : "";
    if (items.length) {
      html += `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;width:100%">${items.map((l) =>
        `<tr><td style="vertical-align:top;width:18px;padding:0 0 10px;color:#CF743C;font-size:15px;line-height:1.6">&#8226;</td><td style="padding:0 0 10px;font-size:15px;line-height:1.6;color:#404951">${linkHtml(l.replace(/^\s*[-•*]\s+/, ""))}</td></tr>`).join("")}</table>`;
    }
    return html;
  }).join("");
}

export async function emailAnswer(q: AskRow) {
  if (!q.email || !q.answer) return false;
  const page = q.published && q.slug ? absoluteUrl(`/ask/${q.slug}`) : absoluteUrl(`/ask/status/${q.token}`);
  const first = q.name?.trim().split(" ")[0];
  const label = "font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#5f6a74;margin:0 0 6px";
  const body = `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6">Hi ${esc(first || "there")},<br>Thanks for asking Labb. Here's the answer from our team.</p>
    <div style="background:#f3f5f6;border-radius:8px;padding:14px 18px;margin:0 0 22px">
      <p style="${label}">Your question</p>
      <p style="margin:0;font-size:16px;line-height:1.5;font-weight:bold;color:#404951">${esc(q.question)}</p>
    </div>
    <p style="${label}">Our answer</p>
    <div style="border-left:3px solid #CF743C;padding:2px 0 0 16px;margin:0 0 24px">${answerHtml(q.answer)}</div>
    <p style="margin:0 0 24px"><a href="${page}" style="background:#CF743C;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;display:inline-block;font-size:15px">View the answer online</a></p>
    <p style="margin:0;font-size:14px;line-height:1.6">Have a follow-up question? Just reply to this email, or <a href="${absoluteUrl("/schedule")}" style="color:#CF743C;font-weight:bold;text-decoration:none">book a call with Labb</a>.</p>`;
  const html = emailLayout("Your question, answered", body);
  const text = `Hi ${first || "there"},\n\nThanks for asking Labb. Here's the answer from our team.\n\nYOUR QUESTION\n${q.question}\n\nOUR ANSWER\n${q.answer}\n\nView online: ${page}\n\nHave a follow-up? Reply to this email or book a call: ${absoluteUrl("/schedule")}\n\nRamsey Diagnostics Corporation d/b/a Labb, 2115 Granby Street, Norfolk, VA 23517, info@labb.com`;
  return sendMail(q.email, `Your question for Labb: ${q.question.slice(0, 70)}${q.question.length > 70 ? "..." : ""}`, html, text, { replyTo: "info@labb.com" });
}
