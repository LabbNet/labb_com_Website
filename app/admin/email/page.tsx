import type { Metadata } from "next";
import Link from "next/link";
import { AdminBar, Flash } from "@/components/AdminBar";
import { EmailCompose } from "@/components/EmailCompose";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { AUDIENCES, audienceCounts, type Campaign } from "@/lib/broadcast";

export const metadata: Metadata = { title: "Email", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { draft: "s-invited", sending: "s-invited", sent: "s-active", failed: "s-disabled" };

export default async function EmailPage() {
  await requireAdmin("/admin/email");
  const [counts, list, flash] = await Promise.all([
    audienceCounts(),
    sql()<Campaign[]>`select id, audience, subject, status, recipients, sent, failed, created_at, sent_at from email_campaigns order by coalesce(sent_at, created_at) desc limit 100`,
    readFlash(),
  ]);
  return (
    <>
      <AdminBar title="Email" current="/admin/email" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <div className="email-grid">
            <div>
              <h2 style={{ marginTop: 0 }}>New email</h2>
              <EmailCompose counts={counts} />
            </div>
            <aside>
              <h2 style={{ marginTop: 0 }}>Sent and drafts</h2>
              {!list.length && <p className="fine">Nothing yet.</p>}
              <ul className="email-list">
                {list.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/email/${c.id}`}>
                      <strong>{c.subject}</strong>
                      <span className="fine">{AUDIENCES[c.audience].label} · {c.status === "draft" ? `Draft, ${fmtDate(c.created_at)}` : `${c.sent} sent${c.failed ? `, ${c.failed} failed` : ""} · ${fmtDate(c.sent_at)}`}</span>
                    </Link>
                    <span className={`status ${STATUS[c.status]}`}>{c.status === "draft" ? "Draft" : c.status === "sent" ? "Sent" : c.status === "sending" ? "Sending" : "Failed"}</span>
                  </li>
                ))}
              </ul>
              <div className="email-counts">
                <p><strong>{counts.cpp}</strong> CPP members (active accounts)</p>
                <p><strong>{counts.newsletter}</strong> newsletter subscribers</p>
                <p className="fine">Unsubscribed people are left out automatically.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
