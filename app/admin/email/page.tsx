import type { Metadata } from "next";
import Link from "next/link";
import { AdminBar, Flash } from "@/components/AdminBar";
import { EmailCompose } from "@/components/EmailCompose";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { AUDIENCES, audienceCounts, type Campaign } from "@/lib/broadcast";
import { campaignStats, pct } from "@/lib/emailStats";

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
  const stats = await campaignStats(list.filter((c) => c.status !== "draft").map((c) => c.id));
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <h2 style={{ marginTop: 0 }}>Sent and drafts</h2>
                <Link href="/admin/email/analytics" className="fine">Email analytics →</Link>
              </div>
              {!list.length && <p className="fine">Nothing yet.</p>}
              <ul className="email-list">
                {list.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/email/${c.id}`}>
                      <strong>{c.subject}</strong>
                      <span className="fine">{AUDIENCES[c.audience].label} · {c.status === "draft" ? `Draft, ${fmtDate(c.created_at)}` : `${c.sent} sent${c.failed ? `, ${c.failed} failed` : ""} · ${fmtDate(c.sent_at)}`}</span>
                    </Link>
                    {stats[c.id] && c.sent > 0 && (
                      <span className="em-mini">
                        <span title="Opened (unique)">Opened {pct(stats[c.id].opened, stats[c.id].delivered || c.sent)}</span>
                        <span title="Clicked (unique)">Clicked {pct(stats[c.id].clicked, stats[c.id].delivered || c.sent)}</span>
                        {stats[c.id].bounced > 0 && <span title="Bounced">{stats[c.id].bounced} bounced</span>}
                      </span>
                    )}
                    <span className={`status ${STATUS[c.status]}`}>{c.status === "draft" ? "Draft" : c.status === "sent" ? "Sent" : c.status === "sending" ? "Sending" : "Failed"}</span>
                  </li>
                ))}
              </ul>
              <div className="email-counts">
                <p><strong>{counts.cpp}</strong> CPP members (active accounts)</p>
                <p><strong>{counts.employers}</strong> on the employer newsletter</p>
                <p><strong>{counts.clinics}</strong> on the clinic newsletter</p>
                <p className="fine">Employers and clinics join by checking the newsletter box on any form or signing up in the footer. Clinics that apply to the CPP join the clinic list.</p>
                <p className="fine">Unsubscribed people are left out automatically.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
