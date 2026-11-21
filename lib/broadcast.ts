import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { site } from "@/lib/site";

// HTML email broadcasts to CPP members or newsletter subscribers, sent through SendGrid in batches.
export type Audience = "cpp" | "employers" | "clinics" | "treatment" | "corrections" | "newsletter" | "sequences";
export type ListAudience = "employers" | "clinics" | "treatment" | "corrections";
export const AUDIENCES: Record<Audience, { label: string; why: string }> = {
  cpp: { label: "CPP members", why: "You're receiving this because you're a member of the Labb Channel Partner Program." },
  employers: { label: "Employer newsletter", why: "You're receiving this because you joined the Labb newsletter for employers at labb.com." },
  clinics: { label: "Clinic newsletter", why: "You're receiving this because you joined the Labb newsletter for clinics and collection sites at labb.com." },
  treatment: { label: "Treatment center newsletter", why: "You're receiving this because you joined the Labb newsletter for treatment and recovery programs." },
  corrections: { label: "Corrections newsletter", why: "You're receiving this because you joined the Labb newsletter for corrections agencies." },
  newsletter: { label: "All newsletter subscribers (old list)", why: "You're receiving this because you subscribed to Labb updates at labb.com." },
  sequences: { label: "Guidebook emails", why: "You're receiving this because a Labb guidebook was shared with you." },
};
// The lists offered when composing an email. "newsletter" is kept only for older campaigns.
export const SEND_AUDIENCES: Audience[] = ["cpp", "employers", "clinics", "treatment", "corrections"];
export const LISTS: ListAudience[] = ["employers", "clinics", "treatment", "corrections"];
export const isAudience = (a: string): a is Audience => a in AUDIENCES;

// Which form segments feed each newsletter list.
// Earlier footer sign-ups had no type ("other"); they stay on the employer list.
const LIST_SEGMENTS: Record<ListAudience, string[]> = { employers: ["employer", "other", "general"], clinics: ["collection-site"], treatment: ["treatment"], corrections: ["corrections"] };

export type Campaign = {
  id: string; audience: Audience; subject: string; preheader: string; html: string; wrap: boolean;
  status: "draft" | "sending" | "sent" | "failed"; recipients: number; sent: number; failed: number; error: string | null;
  created_at: Date; updated_at: Date; sent_at: Date | null; created_name: string | null; sent_name: string | null;
};

export async function getCampaign(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [c] = await sql()<Campaign[]>`select c.*, a.name as created_name, b.name as sent_name from email_campaigns c
    left join members a on a.id = c.created_by left join members b on b.id = c.sent_by where c.id = ${id}`;
  return c ?? null;
}

// Recipients: active CPP members with active accounts, or everyone who signed up for the newsletter. Minus unsubscribes.
export async function recipients(audience: Audience): Promise<{ email: string; name: string | null }[]> {
  const db = sql();
  if (audience === "sequences") return []; // guidebook sequences are sent one lead at a time (lib/sequences.ts)
  if (audience === "cpp") {
    return db<{ email: string; name: string | null }[]>`
      select distinct on (lower(m.email)) lower(m.email) as email, m.name from members m
      where m.role = 'member' and m.status = 'active' and m.cpp_status = 'active' and m.email like '%@%'
        and not exists (select 1 from email_suppressions s where s.email = lower(m.email) and s.audience = 'cpp')
      order by lower(m.email)`;
  }
  // Newsletter lists: people who opted in on a form, by the kind of organization they told us they are.
  // Clinics that apply to the CPP join the clinic list. An unsubscribe from the old single list still applies.
  const segs = audience === "newsletter" ? null : LIST_SEGMENTS[audience as ListAudience];
  // Plus opt-in contacts imported from HubSpot or Labb Station that an admin put on this list.
  return db<{ email: string; name: string | null }[]>`
    select distinct on (email) email, name from (
      select lower(l.email) as email, nullif(trim(coalesce(l.first_name, '') || ' ' || coalesce(l.last_name, '')), '') as name, l.created_at
      from leads l
      where ((l.type = 'newsletter' or l.data->>'newsletter' = 'true') or (${audience === "clinics"} and l.type = 'cpp-application'))
        and (${segs === null} or l.segment = any(${segs ?? []}) or (${audience === "clinics"} and l.type = 'cpp-application'))
        and l.email like '%@%'
      union all
      select lower(c.email), nullif(trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')), ''), c.created_at
      from contact_imports c where c.status = 'assigned' and (c.list = ${audience} or ${segs === null}) and c.email like '%@%'
    ) x
    where not exists (select 1 from email_suppressions s where s.email = x.email and s.audience in (${audience}, 'newsletter'))
    order by email, created_at desc`;
}

export async function audienceCounts(): Promise<Record<Audience, number>> {
  const [cpp, employers, clinics, treatment, corrections, newsletter] = await Promise.all((["cpp", "employers", "clinics", "treatment", "corrections", "newsletter"] as Audience[]).map((a) => recipients(a)));
  return { cpp: cpp.length, employers: employers.length, clinics: clinics.length, treatment: treatment.length, corrections: corrections.length, newsletter: newsletter.length, sequences: 0 };
}

// ---- Unsubscribe links (signed, no stored tokens) ----
function secret() {
  return process.env.SESSION_SECRET || "local-dev-secret";
}
export function unsubToken(email: string, audience: Audience) {
  return createHmac("sha256", secret()).update(`unsub:${audience}:${email.toLowerCase()}`).digest("base64url").slice(0, 32);
}
export function checkUnsub(email: string, audience: string, token: string) {
  if (!isAudience(audience) || !email || !token) return false;
  const a = Buffer.from(unsubToken(email, audience));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function unsubUrl(email: string, audience: Audience) {
  const q = new URLSearchParams({ e: email.toLowerCase(), a: audience, t: unsubToken(email, audience) });
  return `${site.url}/unsubscribe?${q}`;
}
export function oneClickUrl(email: string, audience: Audience) {
  const q = new URLSearchParams({ e: email.toLowerCase(), a: audience, t: unsubToken(email, audience) });
  return `${site.url}/api/email/unsubscribe?${q}`;
}
export async function suppress(email: string, audience: Audience) {
  await sql()`insert into email_suppressions (email, audience) values (${email.toLowerCase()}, ${audience}) on conflict do nothing`;
  if (audience === "sequences") {
    // Stop every guidebook sequence still running for this address.
    const runs = await sql()<{ id: string }[]>`update sequence_runs set status = 'unsubscribed', updated_at = now() where lower(email) = ${email.toLowerCase()} and status = 'active' returning id`;
    if (runs.length) await sql()`update sequence_sends set status = 'canceled' where status = 'queued' and run_id = any(${runs.map((r) => r.id)})`;
  }
}

// ---- Building the message ----
const UNSUB = "%%unsubscribe_url%%";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function cleanHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function footer(audience: Audience, unsub: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#5f6a74;text-align:center;padding:16px 12px;border-top:1px solid #dfe5e5">
${AUDIENCES[audience].why}<br>
Ramsey Diagnostics Corporation d/b/a Labb, 2115 Granby Street, Norfolk, VA 23517<br>
<a href="${unsub}" style="color:#5f6a74">Unsubscribe</a> &nbsp;|&nbsp; <a href="${site.url}" style="color:#5f6a74">labb.com</a></td></tr></table>`;
}

// Full message HTML. `unsub` is the real link for a preview/test, or the SendGrid placeholder for a broadcast.
export { footer as listFooter };
export function buildHtml(c: Pick<Campaign, "audience" | "subject" | "preheader" | "html" | "wrap">, unsub: string) {
  const body = cleanHtml(c.html);
  const pre = c.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(c.preheader)}${"&#847;&zwnj;&nbsp;".repeat(30)}</div>`
    : "";
  const foot = footer(c.audience, unsub);
  if (/<html[\s>]/i.test(body)) {
    // A complete email design: keep it as is, add the preheader after <body> and the footer before </body>.
    let out = body;
    out = /<body[^>]*>/i.test(out) ? out.replace(/<body[^>]*>/i, (m) => m + pre) : pre + out;
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, foot + "</body>") : out + foot;
    return out;
  }
  const inner = c.wrap
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f5"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#404951;padding:18px 28px;border-bottom:4px solid #CF743C"><img src="${site.url}/brand/labb-logo-white.png" alt="Labb" width="96" style="display:block;border:0;height:auto"></td></tr>
<tr><td style="padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#404951">${body}</td></tr>
</table>${foot}</td></tr></table>`
    : `${body}${foot}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(c.subject)}</title></head><body style="margin:0;padding:0">${pre}${inner}</body></html>`;
}

export function toText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<(br|\/p|\/div|\/tr|\/h[1-6]|\/li)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#?\w+;/g, "")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const fromAddr = () => {
  const f = process.env.MAIL_FROM || "Labb <info@mail.labb.com>";
  const m = f.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || "Labb", email: m[2] } : { email: f.trim(), name: "Labb" };
};

// Test send to one address, with a real unsubscribe link.
export async function sendTest(c: Campaign, to: string) {
  const html = buildHtml(c, unsubUrl(to, c.audience));
  return sendMail(to, `[Test] ${c.subject}`, html, toText(html), { replyTo: c.audience === "cpp" ? "LCPPS@labb.com" : "info@labb.com" });
}

// Broadcast. SendGrid: up to 500 recipients per request, each with their own unsubscribe link and one-click unsubscribe header.
export async function sendCampaign(c: Campaign): Promise<{ sent: number; failed: number; error?: string }> {
  const list = await recipients(c.audience);
  const replyTo = c.audience === "cpp" ? "LCPPS@labb.com" : "info@labb.com";
  const html = buildHtml(c, UNSUB);
  const text = toText(html);
  let sent = 0;
  let failed = 0;
  let error: string | undefined;

  if (process.env.SENDGRID_API_KEY) {
    for (let i = 0; i < list.length; i += 500) {
      const batch = list.slice(i, i + 500);
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: batch.map((r) => {
            return {
              to: [{ email: r.email, ...(r.name ? { name: r.name } : {}) }],
              substitutions: { [UNSUB]: unsubUrl(r.email, c.audience) },
              headers: { "List-Unsubscribe": `<${oneClickUrl(r.email, c.audience)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
            };
          }),
          from: fromAddr(),
          reply_to: { email: replyTo },
          subject: c.subject,
          content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: html },
          ],
          categories: [`broadcast-${c.audience}`],
          custom_args: { campaign: c.id },
        }),
      }).catch((e: unknown) => ({ ok: false, status: 0, text: async () => String(e) }) as Response);
      if (res.ok) sent += batch.length;
      else {
        failed += batch.length;
        error = `SendGrid ${res.status}: ${(await res.text()).slice(0, 300)}`;
        console.error("[broadcast]", error);
      }
    }
  } else {
    // No SendGrid: one message per person through whatever mail provider is set up.
    for (const r of list) {
      const one = buildHtml(c, unsubUrl(r.email, c.audience));
      (await sendMail(r.email, c.subject, one, toText(one), { replyTo })) ? sent++ : failed++;
    }
    if (failed) error = "Some messages failed. Check the mail settings.";
  }
  return { sent, failed, error };
}
