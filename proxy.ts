import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verify } from "@/lib/session";

// Countries that can see labb.com: North America, Central America and the Caribbean, plus US territories.
// Everyone else gets a short "not available in your region" page. The country comes from the cf-ipcountry
// header that Render's Cloudflare edge sets on every request (visitors can't set it themselves).
// Requests with no country (Render health checks, local dev) are let through. Set GEO_BLOCK=off in Render to pause it.
const ALLOWED = new Set([
  "US", "CA", "MX", "GL", "PM", "BM", // North America
  "BZ", "CR", "SV", "GT", "HN", "NI", "PA", // Central America
  "AG", "AI", "AW", "BB", "BL", "BQ", "BS", "CU", "CW", "DM", "DO", "GD", "GP", "HT", "JM", "KN", "KY", "LC", "MF", "MQ", "MS", "PR", "SX", "TC", "TT", "VC", "VG", "VI", // Caribbean
  "GU", "AS", "MP", "UM", // other US territories
]);
// Payment and scheduled-job callbacks must always get through.
const GEO_EXEMPT = ["/api/stripe/webhook", "/api/cron/"];
const GATED = ["/members", "/admin", "/learn", "/api/members", "/reads"];

function blocked() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Labb</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#404951;color:#fff;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:24px}main{max-width:460px}h1{font-size:1.6rem;margin:0 0 10px}a{color:#f0b48c}</style></head>
<body><main><h1>Labb.com isn't available in your region</h1><p>Our services are offered in North America and Central America. Questions? Email <a href="mailto:info@labb.com">info@labb.com</a>.</p></main></body></html>`;
  return new NextResponse(html, { status: 403, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}

// Fast cookie gate for member and admin areas. Pages re-check the account in the database
// (status and session version) on every request, see lib/auth.ts currentMember().
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const country = req.headers.get("cf-ipcountry")?.toUpperCase();
  if (process.env.GEO_BLOCK !== "off" && country && country !== "XX" && !ALLOWED.has(country) && !GEO_EXEMPT.some((p) => pathname.startsWith(p))) {
    return blocked();
  }
  if (!GATED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  const access = await verify(req.cookies.get(COOKIE)?.value);
  const needsAdmin = pathname.startsWith("/admin");
  // Course learners only get the learning area; the CPP portal and its files are for members.
  const membersOnly = pathname.startsWith("/members") || pathname.startsWith("/api/members");
  if (access?.mid && access.role === "learner" && (membersOnly || needsAdmin)) {
    const url = req.nextUrl.clone();
    url.pathname = "/learn";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // Confidential area: anyone not signed in gets a plain "not found", so the address reveals nothing.
  if (pathname.startsWith("/reads") && !access?.mid) {
    const url = req.nextUrl.clone();
    url.pathname = "/_not-found";
    url.search = "";
    return NextResponse.rewrite(url, { status: 404 });
  }
  // Read admins only get the reads schedule.
  if (access?.mid && access.role === "reader" && (membersOnly || needsAdmin || pathname.startsWith("/learn"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/reads";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (!access?.mid || (needsAdmin && access.role !== "admin")) {
    const url = req.nextUrl.clone();
    url.pathname = access?.mid && needsAdmin ? "/members" : "/login";
    url.search = access?.mid && needsAdmin ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "private, no-store");
  // One-time messages: the page reads labb_flash from this request, then the browser drops it,
  // so the message shows once instead of sticking until the cookie expires.
  const prefetch = req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch";
  if (req.method === "GET" && !prefetch && req.cookies.has("labb_flash")) {
    for (const path of ["/", "/admin", "/members"]) {
      res.headers.append("Set-Cookie", `labb_flash=; Path=${path}; Max-Age=0; HttpOnly; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    }
  }
  return res;
}

// Every request except built files and images (the region check covers pages and APIs; the gates use GATED above).
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|img/|icon|apple-icon).*)"] };
