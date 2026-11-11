import type { Metadata } from "next";
import { Flash } from "@/components/AdminBar";
import { fmtDate, readFlash } from "@/lib/admin";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { leadName, type LeadRow } from "@/lib/leads";
import { LEAD_STATUSES, segmentLabel, statusLabel } from "@/lib/segments";

export const metadata: Metadata = { title: "My leads", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Leads Labb has passed to this CPP member. Partners can update status and add notes; Labb sees every change.
export default async function MemberLeads() {
  const m = (await currentMember())!; // layout guarantees a signed-in member
  const [rows, flash] = await Promise.all([
    sql()<LeadRow[]>`select * from leads where partner_id = ${m.id} and owner = 'partner' and not archived order by passed_at desc nulls last, created_at desc`,
    readFlash(),
  ]);

  return (
    <section className="section" style={{ paddingTop: 32 }}>
      <div className="wrap">
        <h1 style={{ fontSize: "1.8rem" }}>Leads from Labb</h1>
        <p>Labb passes leads to channel partners. Please contact each one promptly and keep its status current so Labb knows how it went.</p>
        <Flash flash={flash} />
        {!rows.length && <p className="hero-card">No leads have been passed to you yet.</p>}
        <div style={{ display: "grid", gap: 20 }}>
          {rows.map((l) => (
            <div className="hero-card" key={l.id}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", margin: 0 }}>{leadName(l)}</h2>
                  <span className="fine">{segmentLabel(l.segment)} · passed {fmtDate(l.passed_at)} ET</span>
                </div>
                <span className={`status s-${l.status}`} style={{ alignSelf: "flex-start" }}>{statusLabel(l.status)}</span>
              </div>
              <table className="lead-facts" style={{ marginTop: 12 }}>
                <tbody>
                  {([
                    ["Organization", l.company],
                    ["Email", l.email],
                    ["Phone", l.phone],
                    ["City / State", [l.city, l.state].filter(Boolean).join(", ")],
                    ["Interested in", l.products],
                    ["Monthly volume", l.volume],
                    ["Message", l.message],
                  ] as [string, string | null][]).filter(([, v]) => v).map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
                </tbody>
              </table>
              <form action="/api/members/leads" method="post" className="lead-actions" style={{ marginTop: 14 }}>
                <input type="hidden" name="id" value={l.id} />
                <div className="fields">
                  <div className="field">
                    <label htmlFor={`st-${l.id}`}>Status</label>
                    <select id={`st-${l.id}`} name="status" defaultValue={l.status}>
                      {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`nt-${l.id}`}>Note for Labb (optional)</label>
                    <input id={`nt-${l.id}`} name="note" maxLength={2000} />
                  </div>
                </div>
                <button className="btn btn-outline-dark" type="submit" style={{ justifySelf: "start" }}>Save update</button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
