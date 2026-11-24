import "server-only";
import { createHmac } from "node:crypto";
import { sql } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

// Email analytics from the SendGrid Event Webhook (see /api/email/events).

export const webhookKey = () => createHmac("sha256", process.env.SESSION_SECRET || "dev").update("sendgrid-events").digest("base64url").slice(0, 32);
export const webhookUrl = () => absoluteUrl(`/api/email/events?k=${webhookKey()}`);

export type CampaignStats = { campaign: string; delivered: number; opened: number; clicked: number; bounced: number; spam: number; opens: number; clicks: number };

// Unique people per event, per campaign.
export async function campaignStats(ids: string[]): Promise<Record<string, CampaignStats>> {
  if (!ids.length) return {};
  const rows = await sql()<CampaignStats[]>`
    select campaign::text as campaign,
      count(distinct lower(email)) filter (where event = 'delivered')::int as delivered,
      count(distinct lower(email)) filter (where event = 'open')::int as opened,
      count(distinct lower(email)) filter (where event = 'click')::int as clicked,
      count(distinct lower(email)) filter (where event in ('bounce', 'dropped'))::int as bounced,
      count(distinct lower(email)) filter (where event = 'spamreport')::int as spam,
      count(*) filter (where event = 'open')::int as opens,
      count(*) filter (where event = 'click')::int as clicks
    from email_events where campaign = any(${ids}::uuid[]) group by campaign`.catch(() => []);
  return Object.fromEntries(rows.map((r) => [r.campaign, r]));
}

export async function topLinks(campaign: string) {
  return sql()<{ url: string; people: number; clicks: number }[]>`
    select url, count(distinct lower(email))::int as people, count(*)::int as clicks from email_events
    where campaign = ${campaign} and event = 'click' and url is not null group by url order by people desc, clicks desc limit 15`.catch(() => []);
}

// People who clicked, with their name and lead when we have one (good follow-ups).
export async function clickers(campaign: string) {
  return sql()<{ email: string; name: string | null; company: string | null; lead_id: string | null; clicks: number; last: Date }[]>`
    with k as (select lower(email) as email, count(*)::int as clicks, max(ts) as last from email_events
      where campaign = ${campaign} and event = 'click' group by lower(email))
    select k.email, k.clicks, k.last,
      (select nullif(trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')), '') from contact_imports c where lower(c.email) = k.email limit 1) as name,
      coalesce((select c.company from contact_imports c where lower(c.email) = k.email limit 1), (select l.company from leads l where lower(l.email) = k.email order by l.created_at desc limit 1)) as company,
      (select l.id::text from leads l where lower(l.email) = k.email order by l.created_at desc limit 1) as lead_id
    from k order by k.last desc limit 200`.catch(() => []);
}

export async function bounces(campaign: string) {
  return sql()<{ email: string; event: string; reason: string | null; ts: Date }[]>`
    select distinct on (lower(email)) lower(email) as email, event, reason, ts from email_events
    where campaign = ${campaign} and event in ('bounce', 'dropped', 'spamreport') order by lower(email), ts desc limit 300`.catch(() => []);
}

// Guidebook email series: each step's reach.
export async function sequenceStats(days = 90) {
  return sql()<{ sequence: string; step: number; sent: number; delivered: number; opened: number; clicked: number; bounced: number }[]>`
    select r.sequence, s.step, count(*)::int as sent,
      count(*) filter (where exists (select 1 from email_events e where e.sequence_run = r.id and e.step = s.step and e.event = 'delivered'))::int as delivered,
      count(*) filter (where exists (select 1 from email_events e where e.sequence_run = r.id and e.step = s.step and e.event = 'open'))::int as opened,
      count(*) filter (where exists (select 1 from email_events e where e.sequence_run = r.id and e.step = s.step and e.event = 'click'))::int as clicked,
      count(*) filter (where exists (select 1 from email_events e where e.sequence_run = r.id and e.step = s.step and e.event in ('bounce', 'dropped')))::int as bounced
    from sequence_sends s join sequence_runs r on r.id = s.run_id
    where s.status = 'sent' and s.sent_at > now() - make_interval(days => ${days})
    group by r.sequence, s.step order by r.sequence, s.step`.catch(() => []);
}

export async function lastEventAt() {
  const [r] = await sql()<{ ts: Date | null }[]>`select max(ts) as ts from email_events`.catch(() => [{ ts: null }]);
  return r?.ts ?? null;
}

export const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 1000) / 10}%` : "0%");
