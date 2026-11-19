import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBar, Flash } from "@/components/AdminBar";
import { EmailCompose } from "@/components/EmailCompose";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { AUDIENCES, audienceCounts, buildHtml, getCampaign } from "@/lib/broadcast";

export const metadata: Metadata = { title: "Email", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EmailDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin("/admin/email");
  const c = await getCampaign((await params).id);
  if (!c) notFound();
  const [counts, flash] = await Promise.all([audienceCounts(), readFlash()]);
  const n = counts[c.audience];
  const preview = buildHtml(c, "#unsubscribe");
  const draft = c.status === "draft";

  return (
    <>
      <AdminBar title="Email" current="/admin/email" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <p><Link href="/admin/email">All emails</Link></p>
          <Flash flash={flash} />
          <h1 style={{ fontSize: "1.8rem", margin: "0 0 6px" }}>{c.subject}</h1>
          <p className="fine" style={{ marginTop: 0 }}>
            To {AUDIENCES[c.audience].label} ·{" "}
            {draft ? `Draft by ${c.created_name ?? "admin"}, ${fmtDate(c.created_at)}` : `${c.status === "failed" ? "Failed" : "Sent"} ${fmtDate(c.sent_at)} by ${c.sent_name ?? "admin"}: ${c.sent} of ${c.recipients} delivered to SendGrid${c.failed ? `, ${c.failed} failed` : ""}`}
          </p>
          {c.error && <div className="form-error">{c.error}</div>}

          <div className="email-grid">
            <div>
              <h2 style={{ fontSize: "1.3rem", marginTop: 8 }}>Preview</h2>
              {c.preheader && <p className="fine">Preview text: {c.preheader}</p>}
              <iframe title="Email preview" className="email-preview" sandbox="" srcDoc={preview} />
            </div>
            <aside>
              <div className="email-box">
                <h3>Send a test</h3>
                <form action="/api/admin/email" method="post" className="row-form">
                  <input type="hidden" name="action" value="test" />
                  <input type="hidden" name="id" value={c.id} />
                  <input name="to" type="email" required defaultValue={admin.email} aria-label="Test email address" />
                  <button className="btn btn-outline" type="submit">Send test</button>
                </form>
              </div>
              {draft ? (
                <div className="email-box send">
                  <h3>Send to {n} {AUDIENCES[c.audience].label}</h3>
                  <form action="/api/admin/email" method="post">
                    <input type="hidden" name="action" value="send" />
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="count" value={n} />
                    <label className="check"><input type="checkbox" name="confirm" required /> I checked the test email. Send it to {n} {n === 1 ? "person" : "people"} now.</label>
                    <button className="btn btn-primary btn-block" type="submit" disabled={!n} style={{ marginTop: 12 }}>Send now</button>
                  </form>
                  <p className="fine">This can&apos;t be undone.</p>
                </div>
              ) : null}
              <div className="email-box">
                <form action="/api/admin/email" method="post" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="btn btn-outline" type="submit" name="action" value="duplicate">Duplicate</button>
                  {draft && <button className="btn btn-outline danger" type="submit" name="action" value="delete">Delete draft</button>}
                </form>
              </div>
            </aside>
          </div>

          {draft && (
            <div style={{ marginTop: 36 }}>
              <h2 style={{ fontSize: "1.3rem" }}>Edit</h2>
              <EmailCompose c={c} counts={counts} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
