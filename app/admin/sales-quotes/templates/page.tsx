import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { QuoteFrame } from "@/components/QuoteFrame";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { cleanHtml, ensureDefaultTemplate, PLACEHOLDERS } from "@/lib/salesQuotes";

export const metadata: Metadata = { title: "Quote templates", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Upload HTML quote templates. Each quote starts from a template; placeholders fill in the lead, rep and items.
export default async function QuoteTemplates({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin("/admin/sales-quotes/templates");
  const sp = await searchParams;
  await ensureDefaultTemplate();
  const db = sql();
  const [list, flash] = await Promise.all([
    db<{ id: string; name: string; kind: string; html: string; notes: string | null; active: boolean; updated_at: Date; uses: number }[]>`
      select t.*, (select count(*)::int from sales_quotes q where q.template_id = t.id) as uses from quote_templates t order by t.active desc, t.name`,
    readFlash(),
  ]);
  const editing = list.find((t) => t.id === sp.edit);
  const KIND: Record<string, string> = { any: "Any quote", clinic: "Clinic quotes", employer: "Employer quotes", custom: "Custom quotes" };
  return (
    <>
      <AdminBar title="Quote templates" current="/admin/sales-quotes" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <p style={{ marginTop: 0 }}><Link href="/admin/sales-quotes">← Quotes</Link></p>
          <Flash flash={flash} />
          <h1 style={{ fontSize: "1.8rem", margin: "0 0 6px" }}>Quote templates</h1>
          <p style={{ marginTop: 0 }}>Upload a quote layout as an HTML file. A new quote copies its template, so changing a template doesn&apos;t change quotes already started.</p>

          <div className="qt-grid">
            <div>
              {list.map((t) => (
                <div key={t.id} className={`hero-card qt-item ${t.active ? "" : "qt-off"}`}>
                  <div className="qt-head">
                    <div><strong>{t.name}</strong><br /><span className="fine">{KIND[t.kind]} · used on {t.uses} {t.uses === 1 ? "quote" : "quotes"} · updated {fmtDate(t.updated_at)}{t.active ? "" : " · turned off"}</span></div>
                    <div className="qt-actions">
                      <Link href={`/admin/sales-quotes/templates?edit=${t.id}#form`} className="btn btn-outline-dark btn-sm">Edit</Link>
                      <form action="/api/admin/sales-quotes" method="post"><input type="hidden" name="action" value="template-toggle" /><input type="hidden" name="template" value={t.id} />
                        <button className="linkish" type="submit">{t.active ? "Turn off" : "Turn on"}</button></form>
                    </div>
                  </div>
                  {t.notes && <p className="fine" style={{ textAlign: "left", margin: "6px 0 0" }}>{t.notes}</p>}
                  <details className="qt-preview"><summary>Preview</summary><QuoteFrame html={cleanHtml(t.html)} title={`Preview of ${t.name}`} /></details>
                </div>
              ))}
            </div>
            <div>
              <form id="form" action="/api/admin/sales-quotes" method="post" encType="multipart/form-data" className="hero-card qt-form">
                <h2>{editing ? `Edit: ${editing.name}` : "Upload a template"}</h2>
                <input type="hidden" name="action" value="template-save" />
                {editing && <input type="hidden" name="template" value={editing.id} />}
                <div className="field"><label htmlFor="t-name">Name</label><input id="t-name" name="name" required maxLength={120} defaultValue={editing?.name || ""} placeholder="Clinic quote, 2027" /></div>
                <div className="field"><label htmlFor="t-kind">Use for</label>
                  <select id="t-kind" name="kind" defaultValue={editing?.kind || "any"}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="field"><label htmlFor="t-file">HTML file</label><input id="t-file" name="file" type="file" accept=".html,.htm,text/html" /></div>
                <div className="field"><label htmlFor="t-html">Or paste the HTML</label><textarea id="t-html" name="html" rows={10} defaultValue={editing?.html || ""} spellCheck={false} className="code-area" /></div>
                <div className="field"><label htmlFor="t-notes">Notes for reps (optional)</label><input id="t-notes" name="notes" maxLength={500} defaultValue={editing?.notes || ""} /></div>
                <button className="btn btn-primary" type="submit">{editing ? "Save template" : "Upload template"}</button>
                {editing && <Link href="/admin/sales-quotes/templates" className="fine" style={{ marginLeft: 12 }}>Cancel</Link>}
                <details className="qt-help" open={!editing}>
                  <summary>Placeholders you can use</summary>
                  <p className="fine" style={{ textAlign: "left" }}>Type these anywhere in the HTML. They&apos;re filled in for each quote. Scripts and forms are removed; styles in a &lt;style&gt; tag are kept.</p>
                  <table className="meet-table"><tbody>{PLACEHOLDERS.map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td className="fine">{v}</td></tr>)}</tbody></table>
                </details>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
