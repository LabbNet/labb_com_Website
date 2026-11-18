import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";

export const metadata: Metadata = { title: "Labb Learning", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  if (!dbConfigured) redirect("/login?error=unavailable");
  const m = await currentMember();
  if (!m) redirect("/login?next=/learn");
  return (
    <>
      <section className="member-bar">
        <div className="wrap">
          <div>
            <span className="eyebrow">Labb Learning</span>
            <strong>{m.name}</strong>
            {m.clinic && <span className="muted"> · {m.clinic}</span>}
          </div>
          <nav aria-label="Learning">
            <Link href="/learn">My courses</Link>
            {m.role !== "learner" && <Link href="/members">CPP member area</Link>}
            <form action="/api/auth/logout" method="post" style={{ display: "inline" }}>
              <button type="submit" className="linkish">Sign out</button>
            </form>
          </nav>
        </div>
      </section>
      {children}
    </>
  );
}
