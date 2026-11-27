import "server-only";

// Draft or revise a labb.com article with Claude. The result is always saved as a draft for James to review.
const RULES = `You write articles for labb.com, the website of Labb (Ramsey Diagnostics Corporation d/b/a Labb), a Norfolk, Virginia drug testing technology company.
Labb makes digital rapid test reading (Labb Station), LabbHR workplace screening software, rapid urine and oral fluid test kits, and runs the Labb Channel Partner Program for clinics.
Rules you must follow:
- Plain, direct, professional English for HR managers, employers, clinic owners and program managers. Short paragraphs.
- Never use em dashes. Use commas, colons or separate sentences.
- Do not name laboratory partners or background check providers.
- Do not claim CJIS compliance.
- Never say a person at Labb reads or reviews test results, and never say that no person reviews them. Describe the digital reader only.
- Do not invent statistics, studies, quotes, prices, customers or legal citations. If a fact is needed and not given, write around it or say "check current rules".
- Laws change: when discussing law, keep it general and suggest confirming current requirements.
Format the body with this markup only: a blank line between paragraphs, "## " for headings, "### " for subheadings, "- " for bullets, "1. " for numbered lists, **bold**, *italic*, [link text](https://...), "> " for a quote.
Reply with JSON only: {"title": "...", "description": "one or two sentences, under 280 characters", "body": "..."}`;

export const articleAiReady = () => !!process.env.ANTHROPIC_API_KEY;

async function call(user: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("AI writing needs ANTHROPIC_API_KEY set in Render.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.ARTICLE_MODEL || process.env.ASK_MODEL || "claude-sonnet-5-5", max_tokens: 8000, system: RULES, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`The AI request failed (${res.status}). Try again.`);
  const j = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("The AI reply wasn't usable. Try again.");
  const out = JSON.parse(m[0]) as { title?: string; description?: string; body?: string };
  const clean = (s: string) => s.replace(/\s*[—–]\s*/g, ", ");
  if (!out.title || !out.body) throw new Error("The AI reply was missing the title or text. Try again.");
  return { title: clean(out.title).slice(0, 200), description: clean(out.description || "").slice(0, 300), body: clean(out.body).slice(0, 60000) };
}

export function draftArticle(o: { topic: string; audience: string; notes: string; length: string }) {
  return call(`Write a new article.\nTopic: ${o.topic}\nAudience: ${o.audience || "employers and clinic owners"}\nLength: ${o.length || "about 900 words"}\nNotes and points to include:\n${o.notes || "(none)"}`);
}
export function reviseArticle(a: { title: string; description: string; body: string }, instructions: string) {
  return call(`Revise this article. Change only what the instructions ask, and keep everything else.\nInstructions: ${instructions}\n\nCurrent article as JSON:\n${JSON.stringify(a)}`);
}
