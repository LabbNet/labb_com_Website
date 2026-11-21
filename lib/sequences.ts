import "server-only";
import { sql } from "@/lib/db";
import { esc, sendMail } from "@/lib/mail";
import { listFooter, oneClickUrl, toText, unsubUrl } from "@/lib/broadcast";
import { getResource } from "@/lib/resources";
import { site } from "@/lib/site";
import { linkToken, tagLinks } from "@/lib/visitors";

// Guidebook promotional sequences: five emails over about two and a half weeks that deliver a guidebook
// and then feature the News articles written for it. Labb admins can start any sequence for a lead.
// CPP members can start the employer sequences for their own leads; replies then go to the member.

export type SequenceId =
  | "construction-screening-guidebook" | "manufacturing-screening-guidebook" | "logistics-screening-guidebook"
  | "employers-guidebook" | "healthcare-screening-guidebook" | "hospitality-screening-guidebook"
  | "drug-testing-cost-guidebook" | "clinic-owners-guidebook" | "background-screening-guidebook";

type Def = { id: SequenceId; audience: "employer" | "clinic"; cpp: boolean };
const DEFS: Def[] = [
  { id: "employers-guidebook", audience: "employer", cpp: true },
  { id: "construction-screening-guidebook", audience: "employer", cpp: true },
  { id: "manufacturing-screening-guidebook", audience: "employer", cpp: true },
  { id: "logistics-screening-guidebook", audience: "employer", cpp: true },
  { id: "healthcare-screening-guidebook", audience: "employer", cpp: true },
  { id: "hospitality-screening-guidebook", audience: "employer", cpp: true },
  { id: "drug-testing-cost-guidebook", audience: "employer", cpp: true },
  { id: "clinic-owners-guidebook", audience: "clinic", cpp: false },
  { id: "background-screening-guidebook", audience: "clinic", cpp: false },
];

export const SEQUENCES = DEFS.map((d) => {
  const r = getResource(d.id)!;
  return { ...d, name: r.shortTitle, title: r.title };
});
export const CPP_SEQUENCES = SEQUENCES.filter((s) => s.cpp);
export const isSequence = (id: string) => SEQUENCES.some((s) => s.id === id);
export const sequenceName = (id: string) => SEQUENCES.find((s) => s.id === id)?.name ?? id;

// Day each email goes out, counted from the start. Steps 1 to 3 are the guidebook's articles.
export const STEP_DAYS = [0, 3, 7, 12, 18];
export const STEP_LABELS = ["The guidebook", "Article 1", "Article 2", "Article 3", "Next steps"];

type Starter = { id: string; name: string; email: string; clinic: string | null; role: string };
type LeadLite = { id: string; email: string; first_name: string | null; last_name: string | null; company: string | null };

export async function startSequence(seq: string, lead: LeadLite, by: Starter, asPartner: boolean) {
  const def = SEQUENCES.find((s) => s.id === seq);
  if (!def) return { ok: false as const, error: "Choose a guidebook sequence." };
  if (asPartner && !def.cpp) return { ok: false as const, error: "That sequence isn't available to CPP members." };
  const db = sql();
  const email = lead.email.toLowerCase();
  const [sup] = await db`select 1 from email_suppressions where email = ${email} and audience = 'sequences'`;
  if (sup) return { ok: false as const, error: `${email} unsubscribed from guidebook emails.` };
  const [dup] = await db`select 1 from sequence_runs where lower(email) = ${email} and sequence = ${seq} and status = 'active'`;
  if (dup) return { ok: false as const, error: `The ${def.name} sequence is already running for ${email}.` };
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || null;
  const [run] = await db<{ id: string }[]>`
    insert into sequence_runs (sequence, lead_id, email, name, company, started_by, partner_id)
    values (${seq}, ${lead.id}, ${email}, ${name}, ${lead.company}, ${by.id}, ${asPartner ? by.id : null}) returning id`;
  for (const [step, days] of STEP_DAYS.entries()) {
    await db`insert into sequence_sends (run_id, step, due_at) values (${run.id}, ${step}, now() + make_interval(days => ${days}))`;
  }
  // The first email goes out now rather than waiting for the next dispatch.
  await dispatchSequences(true).catch((e) => console.error("[sequences] first send", e));
  return { ok: true as const, runId: run.id, name: def.name };
}

export async function stopSequence(runId: string) {
  const db = sql();
  await db`update sequence_runs set status = 'stopped', updated_at = now() where id = ${runId} and status = 'active'`;
  await db`update sequence_sends set status = 'canceled' where run_id = ${runId} and status = 'queued'`;
}

export type RunRow = {
  id: string; sequence: string; lead_id: string | null; email: string; status: string; created_at: Date;
  partner_id: string | null; starter_name: string | null; sent: number; next_due: Date | null;
};
export async function runsForLeads(leadIds: string[]) {
  if (!leadIds.length) return [];
  return sql()<RunRow[]>`
    select r.id, r.sequence, r.lead_id, r.email, r.status, r.created_at, r.partner_id, m.name as starter_name,
      (select count(*)::int from sequence_sends s where s.run_id = r.id and s.status = 'sent') as sent,
      (select min(due_at) from sequence_sends s where s.run_id = r.id and s.status = 'queued') as next_due
    from sequence_runs r left join members m on m.id = r.started_by
    where r.lead_id = any(${leadIds}) order by r.created_at desc`;
}

// ---- Sending ----
const utm = (seq: string, step: number) => `utm_source=email&utm_medium=guidebook-sequence&utm_campaign=${seq}&utm_content=step${step}`;
const link = (path: string, seq: string, step: number) => `${site.url}${path}${path.includes("?") ? "&" : "?"}${utm(seq, step)}`;
const button = (href: string, label: string) =>
  `<p style="margin:26px 0"><a href="${href}" style="background:#CF743C;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;display:inline-block">${esc(label)}</a></p>`;

type Run = { id: string; sequence: SequenceId; email: string; name: string | null; company: string | null; partner_id: string | null };
type Partner = { name: string; email: string; clinic: string | null; phone: string | null };

async function compose(run: Run, step: number, partner: Partner | null) {
  const g = getResource(run.sequence)!;
  const first = run.name?.split(" ")[0];
  const hi = `<p>${first ? `Hi ${esc(first)},` : "Hello,"}</p>`;
  const from = partner ? esc(partner.clinic || partner.name) : "Labb";
  const sign = partner
    ? `<p>${esc(partner.name)}${partner.clinic ? `<br>${esc(partner.clinic)}` : ""}${partner.phone ? `<br>${esc(partner.phone)}` : ""}<br><span style="color:#5f6a74;font-size:13px">A Labb Channel Partner</span></p>`
    : `<p>The Labb team<br><a href="mailto:info@labb.com" style="color:#CF743C">info@labb.com</a></p>`;
  const guideUrl = link(`/resources/${g.slug}`, run.sequence, step);
  const clinic = DEFS.find((d) => d.id === run.sequence)?.audience === "clinic";

  if (step === 0) {
    const chapters = g.chapters.slice(0, 5).map((c) => `<li style="margin-bottom:6px"><strong>${esc(c.title)}.</strong> ${esc(c.body)}</li>`).join("");
    return {
      subject: `Your free ${g.shortTitle}`,
      body: `${hi}<p>${partner ? `${from} wanted you to have` : "Here is"} a free copy of the <strong>${esc(g.title)}</strong>. ${esc(g.lede)}</p>
        <p>Inside:</p><ul style="padding-left:20px">${chapters}</ul>${button(guideUrl, "Get the guidebook")}
        <p>Over the next couple of weeks we'll send a few short articles that put the guidebook to work.</p>${sign}`,
    };
  }
  if (step >= 1 && step <= 3) {
    const arts = await sql()<{ slug: string; title: string; description: string }[]>`
      select slug, title, description from articles where guidebook = ${run.sequence} and status = 'published' and publish_at <= now()
      order by publish_at desc, id limit 3`;
    const a = arts[step - 1];
    if (!a) return null; // no article for this step: skip it
    return {
      subject: a.title,
      body: `${hi}<p>${esc(a.description)}</p>${button(link(`/news/${a.slug}`, run.sequence, step), "Read the article")}
        <p style="color:#5f6a74;font-size:14px">From the <a href="${guideUrl}" style="color:#CF743C">${esc(g.shortTitle)}</a>.</p>${sign}`,
    };
  }
  return {
    subject: partner ? `Questions about your screening program?` : `Ready to put the ${g.shortTitle} to work?`,
    body: partner
      ? `${hi}<p>I hope the ${esc(g.shortTitle)} and the articles were useful. If you'd like help setting up testing, moving it in-house or adding background checks, just reply to this email and I'll get back to you.</p>${sign}`
      : `${hi}<p>I hope the ${esc(g.shortTitle)} and the articles were useful. When you're ready, we can help you set up testing, move it in-house or add background checks, through Labb or a partner clinic near you.</p>
        ${clinic ? button(link("/channel-partner-program", run.sequence, step), "Explore the Channel Partner Program") : button(link("/get-a-quote", run.sequence, step), "Get a quote")}
        <p>Or just reply to this email.</p>${sign}`,
  };
}

function wrap(subject: string, body: string, unsub: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head><body style="margin:0;padding:0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f5"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#404951;padding:18px 28px;border-bottom:4px solid #CF743C"><img src="${site.url}/brand/labb-logo-white.png" alt="Labb" width="96" style="display:block;border:0;height:auto"></td></tr>
<tr><td style="padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#404951">${body}</td></tr>
</table>${listFooter("sequences", unsub)}</td></tr></table></body></html>`;
}

async function sendOne(sendId: string) {
  const db = sql();
  const [s] = await db<{ id: string; step: number; run_id: string }[]>`
    update sequence_sends set status = 'sending' where id = ${sendId} and status = 'queued' returning id, step, run_id`;
  if (!s) return;
  const [run] = await db<(Run & { status: string })[]>`select id, sequence, email, name, company, partner_id, status from sequence_runs where id = ${s.run_id}`;
  const done = async (status: string, error: string | null = null) => {
    await db`update sequence_sends set status = ${status}, error = ${error}, sent_at = case when ${status} = 'sent' then now() else null end where id = ${s.id}`;
    const [left] = await db`select 1 from sequence_sends where run_id = ${s.run_id} and status in ('queued', 'sending')`;
    if (!left) await db`update sequence_runs set status = 'completed', updated_at = now() where id = ${s.run_id} and status = 'active'`;
  };
  if (!run || run.status !== "active") return done("canceled");
  const [sup] = await db`select 1 from email_suppressions where email = ${run.email} and audience = 'sequences'`;
  if (sup) {
    await db`update sequence_runs set status = 'unsubscribed', updated_at = now() where id = ${run.id}`;
    await db`update sequence_sends set status = 'canceled' where run_id = ${run.id} and status in ('queued', 'sending')`;
    return;
  }
  const [partner] = run.partner_id
    ? await db<Partner[]>`select name, email, clinic, phone from members where id = ${run.partner_id}`
    : [null];
  const msg = await compose(run, s.step, partner ?? null);
  if (!msg) return done("canceled", "No article for this step");
  const html = tagLinks(wrap(msg.subject, msg.body, unsubUrl(run.email, "sequences")), linkToken(run.email));
  const ok = await sendMail(run.email, msg.subject, html, toText(html), {
    replyTo: partner?.email || "info@labb.com",
    ...(partner ? { from: `${(partner.clinic || partner.name).replace(/[<>"]/g, "")} via Labb <info@mail.labb.com>` } : {}),
    headers: { "List-Unsubscribe": `<${oneClickUrl(run.email, "sequences")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  });
  await done(ok ? "sent" : "failed", ok ? null : "Mail not sent (check the mail settings)");
}

// Sends every sequence email whose day has come. Called alongside scheduled social posts.
export async function dispatchSequences(force = false) {
  void force;
  const due = await sql()<{ id: string }[]>`select id from sequence_sends where status = 'queued' and due_at <= now() order by due_at limit 50`;
  for (const d of due) {
    try {
      await sendOne(d.id);
    } catch (e) {
      console.error("[sequences] send failed", d.id, e);
      await sql()`update sequence_sends set status = 'failed', error = ${e instanceof Error ? e.message.slice(0, 300) : "error"} where id = ${d.id}`;
    }
  }
  return due.length;
}

// Preview of every email in a sequence, for admins.
export async function previewSequence(seq: SequenceId, asPartner: Partner | null) {
  const run: Run = { id: "0", sequence: seq, email: "preview@example.com", name: "Alex Sample", company: "Sample Co", partner_id: null };
  const out: { step: number; day: number; subject: string; html: string }[] = [];
  for (const [step, day] of STEP_DAYS.entries()) {
    const m = await compose(run, step, asPartner);
    if (m) out.push({ step, day, subject: m.subject, html: wrap(m.subject, m.body, "#") });
  }
  return out;
}
