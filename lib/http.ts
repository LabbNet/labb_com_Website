import { NextResponse } from "next/server";

// Public origin of the request. Behind Render's proxy, req.url is the internal address
// (e.g. http://localhost:10000), so use the forwarded host/proto headers.
export function publicOrigin(req: Request) {
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = (h.get("x-forwarded-proto") || "https").split(",")[0].trim();
  if (host && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `${proto}://${host}`;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return new URL(req.url).origin;
}

// A same-site path from untrusted input, or "/" when it would leave the site
// (covers "//evil.com", "/\\evil.com", "/%5Cevil.com" after decoding, and absolute URLs).
export function safePath(path: string | null | undefined, fallback = "/") {
  if (!path || !path.startsWith("/")) return fallback;
  try {
    const base = "https://labb.invalid";
    const u = new URL(path, base);
    return u.origin === base ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}

// 303 redirect to a same-site path (never an open redirect).
export function go(req: Request, path: string) {
  const origin = publicOrigin(req);
  let url: URL;
  try {
    // Backslashes count as slashes in URLs, so "/\\evil.com" would leave the site. Resolve, then
    // keep the result only if it stays on our own origin.
    url = new URL(path.startsWith("/") ? path : "/", origin);
    if (url.origin !== new URL(origin).origin) url = new URL("/", origin);
  } catch {
    url = new URL("/", origin);
  }
  return NextResponse.redirect(url, 303);
}

export const field = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);

// Visitor IP. Render's proxy appends to X-Forwarded-For without clearing what the client sent, so the
// first entry is spoofable. Prefer the headers Render's Cloudflare edge sets, then the last appended hop.
export function clientIp(h: Headers): string {
  const cf = h.get("cf-connecting-ip") || h.get("true-client-ip");
  if (cf) return cf.trim().slice(0, 64);
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1].slice(0, 64);
  }
  return h.get("x-real-ip")?.trim().slice(0, 64) || "unknown";
}

// Sliding-window rate limiter kept in memory (per instance). Old keys are pruned so the map can't grow
// without limit, and it is capped as a backstop.
export class RateLimiter {
  private hits = new Map<string, number[]>();
  private lastPrune = 0;
  constructor(private max: number, private windowMs: number, private cap = 20_000) {}
  private prune(now: number) {
    if (now - this.lastPrune < 60_000 && this.hits.size < this.cap) return;
    this.lastPrune = now;
    for (const [k, list] of this.hits) if (!list.length || now - list[list.length - 1] >= this.windowMs) this.hits.delete(k);
    while (this.hits.size >= this.cap) this.hits.delete(this.hits.keys().next().value as string);
  }
  private recent(key: string, now: number) {
    return (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
  }
  /** True when the key is already at the limit (does not record). */
  blocked(key: string, max = this.max) {
    const now = Date.now();
    const list = this.recent(key, now);
    if (list.length) this.hits.set(key, list); else this.hits.delete(key);
    return list.length >= max;
  }
  record(key: string) {
    const now = Date.now();
    this.prune(now);
    const list = this.recent(key, now);
    list.push(now);
    this.hits.set(key, list);
  }
  /** Records the hit and reports whether it went over the limit. */
  hit(key: string) {
    this.record(key);
    return this.recent(key, Date.now()).length > this.max;
  }
  clear(key: string) {
    this.hits.delete(key);
  }
}
