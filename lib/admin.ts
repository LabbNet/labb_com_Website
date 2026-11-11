import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";

export type FlashMsg = { msg: string; link?: string; kind: "ok" | "error" };

// Short-lived one-time message shown after an admin or partner action.
export async function setFlash(msg: string, kind: "ok" | "error" = "ok", link?: string, path = "/") {
  (await cookies()).set("labb_flash", JSON.stringify({ msg, link, kind }), {
    httpOnly: true, sameSite: "strict", path, maxAge: 120, secure: process.env.NODE_ENV === "production",
  });
}

export async function readFlash(): Promise<FlashMsg | null> {
  try {
    const raw = (await cookies()).get("labb_flash")?.value;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Page guard: signed-in Labb admin, or redirect.
export async function requireAdmin(next: string) {
  if (!dbConfigured) redirect("/login?error=unavailable");
  const admin = await currentMember();
  if (!admin) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (admin.role !== "admin") redirect("/members");
  return admin;
}

export const fmtDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "";
