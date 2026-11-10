import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verify } from "@/lib/session";

// Member-gated paths. Add more prefixes here (e.g. "/members", "/learn") as they launch.
const MEMBER_PATHS = ["/library"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/library/login")) return NextResponse.next();

  if (MEMBER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const access = await verify(req.cookies.get(COOKIE)?.value);
    if (!access?.member) {
      const url = req.nextUrl.clone();
      url.pathname = "/library/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  }
  return NextResponse.next();
}

export const config = { matcher: ["/library/:path*", "/library"] };
