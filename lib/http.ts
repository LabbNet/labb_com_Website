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

// 303 redirect to a same-site path (never an open redirect).
export function go(req: Request, path: string) {
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return NextResponse.redirect(new URL(safe, publicOrigin(req)), 303);
}

export const field = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
