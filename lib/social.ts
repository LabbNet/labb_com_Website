import "server-only";
import { sql } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";
import { sendCampaign, type Campaign } from "@/lib/broadcast";
import { renderBody } from "@/lib/articleFormat";

// Article distribution. Social platforms go out through one Zapier or Make webhook (SOCIAL_WEBHOOK_URL)
// that routes to each platform; the newsletter goes through Labb's own email broadcast.
export const CHANNELS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X" },
  { id: "instagram", label: "Instagram" },
  { id: "nl-employers", label: "Newsletter: employers" },
  { id: "nl-clinics", label: "Newsletter: clinics" },
  { id: "nl-cpp", label: "Newsletter: CPP members" },
] as const;
const NEWSLETTERS: Record<string, "employers" | "clinics" | "cpp"> = { "nl-employers": "employers", "nl-clinics": "clinics", "nl-cpp": "cpp" };
export type Channel = (typeof CHANNELS)[number]["id"];
export const isChannel = (c: string): c is Channel => CHANNELS.some((x) => x.id === c);
export const channelLabel = (c: string) => CHANNELS.find((x) => x.id === c)?.label ?? c;
export const socialConfigured = () => Boolean(process.env.SOCIAL_WEBHOOK_URL);

type ArticleRow = { id: string; slug: string; title: string; description: string; body: string; cover_type: string | null; status: string; publish_at: Date | null; updated_at: Date };

export function defaultMessage(a: { title: string; description: string; slug: string }) {
  return `${a.title}\n\n${a.description}`.trim();
}

async function postSocial(a: ArticleRow, channels: Channel[], message: string, postId: string) {
  const url = absoluteUrl(`/news/${a.slug}?utm_source=social&utm_medium=organic&utm_campaign=article`);
  const image = a.cover_type ? absoluteUrl(`/api/articles/${a.id}/cover`) : null;
  const res = await fetch(process.env.SOCIAL_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.SOCIAL_WEBHOOK_SECRET ? { "X-Labb-Secret": process.env.SOCIAL_WEBHOOK_SECRET } : {}) },
    body: JSON.stringify({
      post_id: postId,
      channels,
      linkedin: channels.includes("linkedin"),
      facebook: channels.includes("facebook"),
      x: channels.includes("x"),
      instagram: channels.includes("instagram"),
      message,
      message_with_link: `${message}\n\n${url}`,
      title: a.title,
      summary: a.description,
      url,
      image_url: image,
    }),
  });
  if (!res.ok) throw new Error(`Webhook ${res.status}`);
}

async function postNewsletter(a: ArticleRow, adminId: string | null, audience: "employers" | "clinics" | "cpp") {
  const link = absoluteUrl(`/news/${a.slug}?utm_source=newsletter&utm_medium=email&utm_campaign=article`);
  const cover = a.cover_type ? `<p><a href="${link}"><img src="${absoluteUrl(`/api/articles/${a.id}/cover`)}" alt="" width="560" style="width:100%;max-width:560px;height:auto;border-radius:8px"></a></p>` : "";
  const intro = renderBody(a.body).split("\n").slice(0, 3).join("\n");
  const html = `${cover}<h1 style="font-size:24px;line-height:30px;margin:0 0 12px">${a.title.replace(/</g, "&lt;")}</h1>${intro}
    <p style="margin:24px 0"><a href="${link}" style="background:#CF743C;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;display:inline-block">Read the full article</a></p>`;
  const db = sql();
  const [c] = await db<Campaign[]>`
    insert into email_campaigns (audience, subject, preheader, html, wrap, status, created_by, sent_by)
    values (${audience}, ${a.title}, ${a.description.slice(0, 140)}, ${html}, true, 'sending', ${adminId}, ${adminId}) returning *`;
  const r = await sendCampaign(c);
  await db`update email_campaigns set status = ${r.error && !r.sent ? "failed" : "sent"}, recipients = ${r.sent + r.failed}, sent = ${r.sent},
    failed = ${r.failed}, error = ${r.error ?? null}, sent_at = now(), updated_at = now() where id = ${c.id}`;
  if (r.error && !r.sent) throw new Error(r.error);
  return r.sent;
}

// Sends one queued post now. Returns what happened per outlet.
export async function runPost(postId: string) {
  const db = sql();
  const [p] = await db<{ id: string; article_id: string; channels: string[]; message: string; created_by: string | null }[]>`
    update article_posts set status = 'sending' where id = ${postId} and status = 'queued' returning id, article_id, channels, message, created_by`;
  if (!p) return null;
  const [a] = await db<ArticleRow[]>`select id, slug, title, description, body, cover_type, status, publish_at, updated_at from articles where id = ${p.article_id}`;
  const result: Record<string, string> = {};
  if (!a || a.status !== "published" || !a.publish_at || a.publish_at.getTime() > Date.now()) {
    // The article isn't live yet: try again later instead of linking to a page people can't open.
    await db`update article_posts set status = 'queued', scheduled_at = greatest(scheduled_at, coalesce(${a?.publish_at ?? null}, now() + interval '15 minutes')) where id = ${p.id}`;
    return { waiting: true };
  }
  const social = p.channels.filter((c) => !NEWSLETTERS[c]) as Channel[];
  if (social.length) {
    if (!socialConfigured()) social.forEach((c) => (result[c] = "Not connected: set SOCIAL_WEBHOOK_URL"));
    else {
      try {
        await postSocial(a, social, p.message, p.id);
        social.forEach((c) => (result[c] = "Sent to automation"));
      } catch (e) {
        social.forEach((c) => (result[c] = `Failed: ${e instanceof Error ? e.message : "error"}`));
      }
    }
  }
  for (const c of p.channels.filter((c) => NEWSLETTERS[c])) {
    try {
      const n = await postNewsletter(a, p.created_by, NEWSLETTERS[c]);
      result[c] = `Emailed ${n} ${n === 1 ? "person" : "people"}`;
    } catch (e) {
      result[c] = `Failed: ${e instanceof Error ? e.message : "error"}`;
    }
  }
  const ok = Object.values(result).filter((v) => !v.startsWith("Failed") && !v.startsWith("Not connected")).length;
  const status = ok === Object.keys(result).length ? "sent" : ok ? "partial" : "failed";
  await db`update article_posts set status = ${status}, result = ${db.json(result)}, sent_at = now() where id = ${p.id}`;
  return { status, result };
}

// Sends every post whose time has come. Called from admin pages, the page-view beacon (at most once a
// minute) and /api/cron/social, so scheduled posts and releases go out without anyone pressing a button.
let lastRun = 0;
export async function dispatchDue(force = false) {
  if (!force && Date.now() - lastRun < 60_000) return 0;
  lastRun = Date.now();
  const due = await sql()<{ id: string }[]>`select id from article_posts where status = 'queued' and scheduled_at <= now() order by scheduled_at limit 10`;
  for (const d of due) {
    try {
      await runPost(d.id);
    } catch (e) {
      console.error("[social] post failed", d.id, e);
    }
  }
  // Guidebook sequence emails ride the same clock.
  const { dispatchSequences } = await import("@/lib/sequences");
  await dispatchSequences().catch((e) => console.error("[sequences] dispatch failed", e));
  return due.length;
}
