import { NextResponse } from "next/server";

// 303 redirect to a same-site path (never an open redirect).
export function go(req: Request, path: string) {
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return NextResponse.redirect(new URL(safe, req.url), 303);
}

export const field = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
