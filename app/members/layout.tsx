import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentMember } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { MemberNav } from "@/components/MemberNav";

export const metadata: Metadata = { title: "CPP Members", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  if (!dbConfigured) redirect("/login?error=unavailable");
  const m = await currentMember();
  if (!m) redirect("/login?next=/members");
  if (m.role === "learner") redirect("/learn");
  if (m.role === "reader") redirect("/reads");
  return (
    <>
      <section className="member-bar admin-bar">
        <div className="wrap">
          <div className="ab-top">
            <div>
              <span className="eyebrow">CPP member area</span>
              <strong>{m.clinic || m.name}</strong>
              {m.clinic && <span className="muted"> · {m.name}</span>}
            </div>
            <div className="ab-util">
              <Link href="/members/account">My account</Link>
              {m.role === "admin" && <Link href="/admin/leads">Labb admin</Link>}
              <form action="/api/auth/logout" method="post"><button type="submit" className="linkish">Sign out</button></form>
            </div>
          </div>
          <MemberNav shelfLife={Boolean(m.shelf_life_tracker) || m.role === "admin"} />
        </div>
      </section>
      {children}
    </>
  );
}
