import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verify } from "@/lib/session";

// Fast cookie gate for member and admin areas. Pages re-check the account in the database
// (status and session version) on every request, see lib/auth.ts currentMember().
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const access = await verify(req.cookies.get(COOKIE)?.value);
  const needsAdmin = pathname.startsWith("/admin");
  if (!access?.mid || (needsAdmin && access.role !== "admin")) {
    const url = req.nextUrl.clone();
    url.pathname = access?.mid && needsAdmin ? "/members" : "/login";
    url.search = access?.mid && needsAdmin ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = { matcher: ["/members", "/members/:path*", "/admin", "/admin/:path*"] };
