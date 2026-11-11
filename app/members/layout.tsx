import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";

export const metadata: Metadata = { title: "CPP Members", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  if (!dbConfigured) redirect("/login?error=unavailable");
  const m = await currentMember();
  if (!m) redirect("/login?next=/members");
  return (
    <>
      <section className="member-bar">
        <div className="wrap">
          <div>
            <span className="eyebrow">CPP member area</span>
            <strong>{m.name}</strong>
            {m.clinic && <span className="muted"> · {m.clinic}</span>}
          </div>
          <nav aria-label="Member">
            <Link href="/members">Resources</Link>
            <Link href="/members/leads">My leads</Link>
            <Link href="/members/account">My account</Link>
            {m.role === "admin" && <Link href="/admin/leads">Labb admin</Link>}
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="linkish">Sign out</button>
            </form>
          </nav>
        </div>
      </section>
      {children}
    </>
  );
}
