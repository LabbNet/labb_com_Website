import { timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { webhookKey } from "@/lib/emailStats";

// SendGrid Event Webhook. SendGrid posts batches of events (delivered, open, click, bounce, dropped, spamreport...).
// The address includes a secret key (shown under Content, Email analytics). Bounces and spam reports also go on
// Do not send so they're never mailed again.
type Ev = { email?: string; event?: string; sg_event_id?: string; timestamp?: number; url?: string; reason?: string; type?: string; campaign?: string; sequence_run?: string; step?: string };
const KEEP = new Set(["processed", "delivered", "open", "click", "bounce", "dropped", "deferred", "spamreport", "unsubscribe", "group_unsubscribe"]);

export async function POST(req: Request) {
  const k = new URL(req.url).searchParams.get("k") || "";
  const want = Buffer.from(webhookKey()), got = Buffer.from(k);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return new Response("forbidden", { status: 403 });
  let events: Ev[] = [];
  try { events = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  if (!Array.isArray(events)) return new Response("ok");
  const db = sql();
  const uuid = /^[0-9a-f-]{36}$/i;
  for (const e of events.slice(0, 5000)) {
    if (!e.email || !e.event || !KEEP.has(e.event) || e.event === "processed" || e.event === "deferred") continue;
    const email = e.email.toLowerCase().slice(0, 254);
    const ts = e.timestamp ? new Date(e.timestamp * 1000) : new Date();
    const campaign = e.campaign && uuid.test(e.campaign) ? e.campaign : null;
    const run = e.sequence_run && /^\d+$/.test(e.sequence_run) ? e.sequence_run : null;
    const step = e.step && /^\d+$/.test(e.step) ? Number(e.step) : null;
    try {
      await db`insert into email_events (sg_event_id, campaign, sequence_run, step, email, event, url, reason, ts)
        select ${e.sg_event_id ?? null}, ${campaign}, ${run}, ${step}, ${email}, ${e.event}, ${e.url?.slice(0, 1000) ?? null}, ${(e.reason || e.type || "").slice(0, 500) || null}, ${ts}
        where ${campaign}::uuid is null or exists (select 1 from email_campaigns where id = ${campaign}::uuid)
        on conflict (sg_event_id) do nothing`;
      if (e.event === "bounce" || e.event === "spamreport" || (e.event === "dropped" && /bounce|invalid/i.test(e.reason || ""))) {
        await db`insert into email_suppressions (email, audience, reason) values (${email}, 'all', ${e.event === "spamreport" ? "spam" : "bounced"})
          on conflict (email, audience) do update set reason = coalesce(email_suppressions.reason, excluded.reason)`;
      }
    } catch (err) {
      console.error("[email events]", err instanceof Error ? err.message : err);
    }
  }
  return new Response("ok");
}
