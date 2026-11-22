import Link from "next/link";
import type { Metadata } from "next";
import { requireReads, pending } from "@/lib/reads";
import { ReadsNav } from "@/components/ReadsNav";

export const metadata: Metadata = { title: "Reads schedule", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ReadsLayout({ children }: { children: React.ReactNode }) {
  const a = await requireReads("/reads");
  const p = a.approver ? await pending() : null;
  const waiting = p ? p.shifts.length + p.adjustments.length : 0;
  const links = [
    { href: "/reads", label: "Schedule" },
    { href: "/reads/hours", label: a.superRead ? "Hours" : "My hours" },
    ...(a.approver || a.superRead ? [{ href: "/reads/approvals", label: waiting ? `Approvals (${waiting})` : "Approvals" }] : []),
    ...(a.approver || a.admin ? [{ href: "/reads/team", label: "Team" }] : []),
  ];
  return (
    <>
      <section className="member-bar admin-bar">
        <div className="wrap">
          <div className="ab-top">
            <div>
              <span className="eyebrow">Reads schedule</span>
              <strong>{a.m.name}</strong>
              <span className="muted"> · {a.approver ? "Super read admin, approver" : a.superRead ? "Super read admin" : a.reader ? "Read admin" : "Labb admin"}</span>
            </div>
            <div className="ab-util">
              {a.m.role === "admin" && <Link href="/admin/crm">Labb admin</Link>}
              <form action="/api/auth/logout" method="post"><button type="submit" className="linkish">Sign out</button></form>
            </div>
          </div>
          <ReadsNav links={links} />
        </div>
      </section>
      {children}
    </>
  );
}
