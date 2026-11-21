import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";

// Visitor identification.
// 1. Known visitors: the Tracker keeps a random visitor id in the browser (and a first-party cookie). When that
//    browser submits a form, or opens a link in a Labb email (which carries a signed "lk" token), the visitor id
//    is linked to the person, so their visits show on the lead.
// 2. Companies: each session's IP address is looked up with IPinfo (IPINFO_TOKEN) to name the organization.
//    Only a keyed hash of the IP is stored.

export const VISITOR_COOKIE = "labb_v";
const ID = /^[a-z0-9]{8,40}$/i;
const secret = () => process.env.SESSION_SECRET || "local-dev-secret";

export async function linkVisitor(visitor: string | undefined | null, email: string, leadId: string | null, source: "form" | "email") {
  if (!visitor || !ID.test(visitor) || !email.includes("@")) return;
  await sql()`
    insert into visitor_links (visitor, email, lead_id, source) values (${visitor}, ${email.toLowerCase()}, ${leadId}, ${source})
    on conflict (visitor, email) do update set lead_id = coalesce(excluded.lead_id, visitor_links.lead_id)`;
}

// Signed token for links in Labb emails: identifies the recipient when they click through.
export function linkToken(email: string) {
  const e = Buffer.from(email.toLowerCase()).toString("base64url");
  const sig = createHmac("sha256", secret()).update(`lk:${email.toLowerCase()}`).digest("base64url").slice(0, 16);
  return `${e}.${sig}`;
}
export function readLinkToken(t: string): string | null {
  const [e, sig] = t.split(".");
  if (!e || !sig) return null;
  let email: string;
  try { email = Buffer.from(e, "base64url").toString("utf8"); } catch { return null; }
  const want = Buffer.from(linkToken(email).split(".")[1]);
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) && email.includes("@") ? email : null;
}

// Add the recipient's token to every labb.com link in an email.
export function tagLinks(html: string, token: string) {
  return html.replace(/href="(https:\/\/(?:www\.)?labb\.com[^"#]*)(#[^"]*)?"/g, (_m, url: string, hash = "") => {
    if (/\/api\/email\/unsubscribe/.test(url)) return `href="${url}${hash}"`;
    return `href="${url}${url.includes("?") ? "&amp;" : "?"}lk=${token}${hash}"`;
  });
}

export async function linkFromToken(visitor: string, token: string) {
  const email = readLinkToken(token);
  if (!email) return;
  const [lead] = await sql()<{ id: string }[]>`select id from leads where lower(email) = ${email} order by created_at desc limit 1`;
  await linkVisitor(visitor, email, lead?.id ?? null, "email");
}

// ---- Company lookup ----
export const ipHash = (ip: string) => createHash("sha256").update(`${secret()}:ip:${ip}`).digest("base64url").slice(0, 32);
type Org = { name: string | null; domain: string | null; kind: string };
const ISP = /comcast|verizon|charter|spectrum|at&t|att services|t-mobile|tmobile|cox comm|frontier|centurylink|lumen|windstream|mediacom|optimum|altice|cable one|sparklight|wow|rcn|astound|google fiber|starlink|hughes|viasat|cellco|sprint|cricket|metronet|ziply|consolidated comm|brightspeed|tds telecom|suddenlink|rogers|bell canada|shaw|telus|vodafone|cloudflare|amazon|google llc|microsoft corp|digitalocean|linode|akamai|ovh|hetzner|oracle|apple inc|private relay|zscaler|fastly|leaseweb|choopa|vultr/i;

async function lookup(ip: string): Promise<Org | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!token || ip === "unknown" || /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd)/.test(ip)) return null;
  const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${token}`, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) return null;
  const j = (await res.json()) as { org?: string; city?: string; region?: string; country?: string; company?: { name?: string; domain?: string; type?: string }; asn?: { name?: string; domain?: string; type?: string } };
  const c = j.company?.name ? j.company : j.asn?.name ? j.asn : null;
  const name = c?.name || (j.org ? j.org.replace(/^AS\d+\s+/, "") : null);
  const domain = c?.domain || null;
  let kind = (c?.type || "").toLowerCase() || "unknown";
  if (name && ISP.test(name) && kind !== "business") kind = kind === "hosting" ? "hosting" : "isp";
  if (kind === "unknown" && name && !ISP.test(name)) kind = "business";
  return { name, domain, kind };
}

// Name the organization for a page view. Cached lookups apply right away; new IPs are looked up in the
// background and the session's views are filled in when the answer comes back.
export async function orgForView(ip: string, viewId: string, session: string) {
  if (!process.env.IPINFO_TOKEN) return;
  const db = sql();
  const h = ipHash(ip);
  const [hit] = await db<(Org & { fresh: boolean })[]>`select name, domain, kind, looked_up_at > now() - interval '30 days' as fresh from ip_orgs where ip_hash = ${h}`;
  const apply = (o: Org) => db`update page_views set org = ${o.name}, org_domain = ${o.domain}, org_kind = ${o.kind}, ip_hash = ${h} where id = ${viewId} or (session = ${session} and org is null)`;
  if (hit?.fresh) return apply(hit);
  void (async () => {
    try {
      const o = await lookup(ip);
      if (!o) return;
      await db`insert into ip_orgs (ip_hash, name, domain, kind) values (${h}, ${o.name}, ${o.domain}, ${o.kind})
        on conflict (ip_hash) do update set name = excluded.name, domain = excluded.domain, kind = excluded.kind, looked_up_at = now()`;
      await apply(o);
    } catch (e) {
      console.error("[visitors] lookup failed", e instanceof Error ? e.message : e);
    }
  })();
}
