import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, sign, verifyMemberLogin } from "@/lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "/library");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/library";

  if (!verifyMemberLogin(password)) {
    return NextResponse.redirect(new URL(`/library/login?error=1&next=${encodeURIComponent(safeNext)}`, req.url), 303);
  }
  const res = NextResponse.redirect(new URL(safeNext, req.url), 303);
  res.cookies.set(COOKIE, await sign({ member: true, lead: true }), cookieOptions);
  return res;
}
