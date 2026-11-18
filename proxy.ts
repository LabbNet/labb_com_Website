import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verify } from "@/lib/session";

// Fast cookie gate for member and admin areas. Pages re-check the account in the database
// (status and session version) on every request, see lib/auth.ts currentMember().
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
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

export const config = { matcher: ["/members", "/members/:path*", "/admin", "/admin/:path*", "/learn", "/learn/:path*", "/api/members/:path*"] };
