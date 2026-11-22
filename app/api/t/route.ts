import { dispatchDue } from "@/lib/social";
import { cookies, headers } from "next/headers";
import { sql } from "@/lib/db";
import { COOKIE, verify } from "@/lib/session";
import { clientIp } from "@/lib/http";
import { linkFromToken, orgForView } from "@/lib/visitors";

// First-party page view beacon. POST {t:"v", ...} records a view and returns its id;
// POST {t:"d", id, ms} sets how long the visitor stayed on that page.
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|facebookexternalhit|embedly/i;
const ID = /^[a-z0-9]{8,40}$/i;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null) || null;

function device(ua: string) {
  const d = /ipad|tablet|(android(?!.*mobile))/i.test(ua) ? "Tablet" : /mobi|iphone|android/i.test(ua) ? "Mobile" : "Desktop";
  const b = /edg\//i.test(ua) ? "Edge" : /opr\/|opera/i.test(ua) ? "Opera" : /samsungbrowser/i.test(ua) ? "Samsung" : /chrome|crios/i.test(ua) ? "Chrome" : /firefox|fxios/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Other";
  const o = /windows/i.test(ua) ? "Windows" : /iphone|ipad|ios/i.test(ua) ? "iOS" : /mac os/i.test(ua) ? "macOS" : /android/i.test(ua) ? "Android" : /cros/i.test(ua) ? "ChromeOS" : /linux/i.test(ua) ? "Linux" : "Other";
  return { d, b, o };
}

export async function POST(req: Request) {
  const h = await headers();
  const ua = h.get("user-agent") || "";
  if (!ua || BOT.test(ua) || h.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 204 });
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 4000) return new Response(null, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  // Scheduled article posts ride along on site traffic (at most once a minute, never delays the response).
  void dispatchDue().catch((e) => console.error("[social] dispatch", e));
  const db = sql();

  // A click on Client login or CPP member login marks the visit as an existing customer's.
  if (body.t === "l") {
    const kind = body.k === "client" ? "client-login" : body.k === "cpp" ? "cpp-login" : null;
    const session = clip(body.s, 40);
    if (kind && session && /^[a-z0-9]+$/i.test(session)) {
      await sql()`insert into session_flags (session, visitor, kind) values (${session}, ${clip(body.v, 40)}, ${kind}) on conflict do nothing`;
    }
    return new Response(null, { status: 204 });
  }
  if (body.t === "d") {
    const id = Number(body.id);
    const ms = Math.min(Math.max(Math.round(Number(body.ms) || 0), 0), 30 * 60_000);
    if (Number.isSafeInteger(id) && id > 0 && ms > 0 && typeof body.s === "string" && ID.test(body.s)) {
      await db`update page_views set duration_ms = ${ms} where id = ${id} and session = ${body.s} and duration_ms is null`;
    }
    return new Response(null, { status: 204 });
  }

  const path = clip(body.p, 300);
  const visitor = clip(body.v, 40);
  const session = clip(body.s, 40);
  if (!path || !path.startsWith("/") || !visitor || !session || !ID.test(visitor) || !ID.test(session)) return new Response(null, { status: 400 });
  if (/^\/(admin|api|_next)(\/|$)/.test(path) || path.startsWith("/__")) return new Response(null, { status: 204 });

  let ref = clip(body.r, 500);
  try {
    if (ref) {
      const u = new URL(ref);
      const self = new URL(req.url).host;
      ref = u.host === self || u.host.endsWith("labb.com") || u.host.endsWith("onrender.com") ? null : u.host.replace(/^www\./, "");
    }
  } catch {
    ref = null;
  }
  const access = await verify((await cookies()).get(COOKIE)?.value);
  const { d, b, o } = device(ua);
  const region = h.get("cf-ipcountry") || h.get("x-vercel-ip-country") || null;
  const [row] = await db<{ id: string }[]>`
    insert into page_views (path, title, referrer, utm_source, utm_medium, utm_campaign, visitor, session, member_id, role, device, browser, os, region)
    values (${path}, ${clip(body.ti, 200)}, ${ref}, ${clip(body.us, 100)}, ${clip(body.um, 100)}, ${clip(body.uc, 150)}, ${visitor}, ${session},
      ${access?.mid ?? null}, ${access?.role ?? null}, ${d}, ${b}, ${o}, ${region})
    returning id`;
  // Visitor identification: the company behind the IP, and the person when they arrive from a Labb email.
  void orgForView(clientIp(h), row.id, session).catch((e) => console.error("[visitors] org", e));
  const lk = clip(body.k, 400);
  if (lk) await linkFromToken(visitor, lk).catch((e) => console.error("[visitors] link", e));
  // Keep about 25 months of history.
  if (Math.random() < 0.002) await db`delete from page_views where ts < now() - interval '25 months'`;
  return Response.json({ id: Number(row.id) });
}
