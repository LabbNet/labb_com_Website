import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar } from "@/components/AdminBar";
import { fmtDate, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { isSequence, previewSequence, SEQUENCES, sequenceName, STEP_DAYS, STEP_LABELS, type SequenceId } from "@/lib/sequences";
import { dispatchDue } from "@/lib/social";

export const metadata: Metadata = { title: "Guidebook sequences", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Every guidebook sequence: what it sends, its articles, and who is receiving it.
export default async function Sequences({ searchParams }: { searchParams: Promise<{ s?: string; as?: string }> }) {
  await requireAdmin("/admin/sequences");
  await dispatchDue();
  const sp = await searchParams;
  const db = sql();
  const [stats, arts, recent] = await Promise.all([
    db<{ sequence: string; active: number; completed: number; total: number }[]>`
      select sequence, count(*) filter (where status = 'active')::int as active, count(*) filter (where status = 'completed')::int as completed, count(*)::int as total
      from sequence_runs group by sequence`,
    db<{ guidebook: string; slug: string; title: string; publish_at: Date }[]>`
      select guidebook, slug, title, publish_at from articles where guidebook is not null and status = 'published' order by publish_at desc`,
    db<{ id: string; sequence: string; email: string; company: string | null; status: string; lead_id: string | null; partner_id: string | null; starter: string | null; created_at: Date; sent: number }[]>`
      select r.id, r.sequence, r.email, r.company, r.status, r.lead_id, r.partner_id, m.name as starter, r.created_at,
        (select count(*)::int from sequence_sends s where s.run_id = r.id and s.status = 'sent') as sent
      from sequence_runs r left join members m on m.id = r.started_by order by r.created_at desc limit 50`,
  ]);
  const open = sp.s && isSequence(sp.s) ? (sp.s as SequenceId) : null;
  const preview = open
    ? await previewSequence(open, sp.as === "cpp" ? { name: "Pat Partner", email: "partner@example.com", clinic: "Sample Clinic", phone: "(555) 555-0100" } : null)
    : [];

  return (
    <>
      <AdminBar title="Guidebook sequences" current="/admin/sequences" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <h1 style={{ fontSize: "1.8rem", marginBottom: 6 }}>Guidebook sequences</h1>
          <p style={{ marginTop: 0, maxWidth: 760 }}>
            Each sequence sends {STEP_DAYS.length} emails: {STEP_LABELS.map((l, i) => `${l.toLowerCase()} (day ${STEP_DAYS[i]})`).join(", ")}.
            Start one from a <Link href="/admin/leads">lead</Link>. CPP members can start the employer sequences for their own leads; those come from their clinic and replies go to them.
          </p>
          <div className="bg-table-wrap">
            <table className="bg-table">
              <thead><tr><th>Guidebook</th><th>For</th><th>CPP</th><th>Articles</th><th>Active</th><th>Completed</th><th></th></tr></thead>
              <tbody>
                {SEQUENCES.map((q) => {
                  const st = stats.find((x) => x.sequence === q.id);
                  const a = arts.filter((x) => x.guidebook === q.id);
                  return (
                    <tr key={q.id}>
                      <td><strong>{q.name}</strong></td>
                      <td>{q.audience === "employer" ? "Employers" : "Clinics"}</td>
                      <td>{q.cpp ? "Yes" : "Labb only"}</td>
                      <td>{a.map((x) => <div key={x.slug}><Link href={`/news/${x.slug}`}>{x.title}</Link> <span className="fine">{fmtDate(x.publish_at).split(",")[0]}</span></div>)}</td>
                      <td>{st?.active ?? 0}</td>
                      <td>{st?.completed ?? 0}</td>
                      <td style={{ whiteSpace: "nowrap" }}><Link href={`/admin/sequences?s=${q.id}#preview`}>Preview</Link>{q.cpp && <> · <Link href={`/admin/sequences?s=${q.id}&as=cpp#preview`}>As CPP</Link></>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {open && (
            <div id="preview" style={{ marginTop: 40 }}>
              <h2 style={{ fontSize: "1.3rem" }}>{sequenceName(open)} {sp.as === "cpp" ? "(sent by a CPP member)" : "(sent by Labb)"}</h2>
              <div className="seq-preview">
                {preview.map((p) => (
                  <div key={p.step} className="hero-card">
                    <p className="fine" style={{ margin: 0 }}>Day {p.day} · {STEP_LABELS[p.step]}</p>
                    <h3 style={{ margin: "4px 0 12px", fontSize: "1.05rem" }}>{p.subject}</h3>
                    <iframe title={p.subject} srcDoc={p.html} sandbox="" style={{ width: "100%", height: 820, border: "1px solid #dfe5e5", borderRadius: 8 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: "1.3rem", marginTop: 40 }}>Recent</h2>
          {!recent.length && <p>No sequences started yet.</p>}
          {recent.length > 0 && (
            <div className="bg-table-wrap">
              <table className="bg-table">
                <thead><tr><th>Started</th><th>Guidebook</th><th>Recipient</th><th>Sent</th><th>Status</th><th>By</th></tr></thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.created_at)}</td>
                      <td>{sequenceName(r.sequence)}</td>
                      <td>{r.lead_id ? <Link href={`/admin/leads/${r.lead_id}`}>{r.company || r.email}</Link> : r.email}</td>
                      <td>{r.sent} of {STEP_DAYS.length}</td>
                      <td>{r.status}</td>
                      <td>{r.starter || "System"}{r.partner_id ? " (CPP)" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
