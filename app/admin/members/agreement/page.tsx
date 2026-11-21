import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

export const metadata: Metadata = { title: "CPP Agreement", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// The CPP agreement PDF sent for electronic signature. Every upload is kept; the newest is the one sent.
export default async function AgreementAdmin() {
  await requireAdmin("/admin/members/agreement");
  const db = sql();
  const [versions, flash] = await Promise.all([
    db<{ id: string; title: string; version: string; filename: string; active: boolean; uploaded_at: Date; by_name: string | null; sent: number; signed: number }[]>`
      select t.id, t.title, t.version, t.filename, t.active, t.uploaded_at, u.name as by_name,
        (select count(*)::int from contract_requests r where r.template_id = t.id) as sent,
        (select count(*)::int from contract_requests r where r.template_id = t.id and r.status = 'signed') as signed
      from contract_templates t left join members u on u.id = t.uploaded_by order by t.uploaded_at desc`,
    readFlash(),
  ]);
  const current = versions.find((v) => v.active);
  return (
    <>
      <AdminBar title="CPP agreement" current="/admin/members/agreement" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap" style={{ maxWidth: 980 }}>
          <p style={{ marginTop: 0 }}><Link href="/admin/members">← All members</Link></p>
          <Flash flash={flash} />
          <div className="split" style={{ alignItems: "start", gridTemplateColumns: "1fr 1fr" }}>
            <div className="hero-card">
              <h2 className="form-title">Agreement sent for signature</h2>
              {current ? (
                <p className="form-sub">
                  <strong>{current.title}</strong>, version {current.version}. Uploaded {fmtDate(current.uploaded_at)}{current.by_name ? ` by ${current.by_name}` : ""}.{" "}
                  <a href={`/api/admin/contracts/template/${current.id}`} target="_blank" rel="noopener">Open the PDF</a>
                </p>
              ) : (
                <p className="form-sub">No agreement uploaded yet. The Send Contract button stays off until you upload one.</p>
              )}
              <p className="form-sub">
                Prospects see this PDF exactly as uploaded, then sign online. The signed copy adds a footer on each page and a
                signature and audit page, and is saved to the member&apos;s contracts.
              </p>
            </div>
            <div className="hero-card">
              <h2 className="form-title">Upload a new version</h2>
              <p className="form-sub">PDF only, up to 15 MB. Links already sent keep the version they were sent with.</p>
              <form action="/api/admin/members/cpp" method="post" encType="multipart/form-data">
                <input type="hidden" name="action" value="template" />
                <div className="fields" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="field">
                    <label htmlFor="t-title">Title</label>
                    <input id="t-title" name="title" defaultValue={current?.title || "Channel Partner Program Agreement"} maxLength={120} required />
                  </div>
                  <div className="field">
                    <label htmlFor="t-version">Version</label>
                    <input id="t-version" name="version" placeholder="For example: 2026.11" maxLength={30} required />
                  </div>
                  <div className="field">
                    <label htmlFor="t-file">Agreement PDF</label>
                    <input id="t-file" name="agreement" type="file" accept=".pdf,application/pdf" required />
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 16 }} type="submit">Upload and use this version</button>
              </form>
            </div>
          </div>
          {versions.length > 0 && (
            <div className="hero-card" style={{ marginTop: 28 }}>
              <h2 className="form-title">All versions</h2>
              <ul className="contract-list">
                {versions.map((v) => (
                  <li key={v.id}>
                    <div>
                      <a href={`/api/admin/contracts/template/${v.id}`} target="_blank" rel="noopener">{v.title}, version {v.version}</a>
                      {v.active && <span className="tag plain" style={{ marginLeft: 8 }}>In use</span>}
                      <span className="sub">{v.filename} · uploaded {fmtDate(v.uploaded_at)}{v.by_name ? ` by ${v.by_name}` : ""} · sent {v.sent}, signed {v.signed}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
