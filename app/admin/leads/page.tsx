import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { findLeads, partnerOptions, type LeadFilters } from "@/lib/leadQuery";
import { leadName } from "@/lib/leads";
import { LEAD_STATUSES, SEGMENTS, segmentLabel, statusLabel } from "@/lib/segments";

export const metadata: Metadata = { title: "Leads", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLeads({ searchParams }: { searchParams: Promise<LeadFilters> }) {
  await requireAdmin("/admin/leads");
  const f = await searchParams;
  const [rows, partners, counts, flash] = await Promise.all([
    findLeads(f),
    partnerOptions(),
    sql()<{ segment: string; n: number; fresh: number }[]>`
      select segment, count(*)::int as n, count(*) filter (where status = 'new')::int as fresh from leads where not archived group by segment`,
    readFlash(),
  ]);
  const bySeg = Object.fromEntries(counts.map((c) => [c.segment, c]));
  const total = counts.reduce((a, c) => a + c.n, 0);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <AdminBar title="Website leads" current="/admin/leads" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <div className="stats" style={{ marginBottom: 22 }}>
            <div><strong>{total}</strong><span>Open leads</span></div>
            {SEGMENTS.filter((s) => s.value !== "other").map((s) => (
              <div key={s.value}>
                <strong>{bySeg[s.value]?.n || 0}</strong>
                <span>{s.short}{bySeg[s.value]?.fresh ? ` (${bySeg[s.value].fresh} new)` : ""}</span>
              </div>
            ))}
          </div>

          <form method="get" className="admin-search">
            <input name="q" defaultValue={f.q} placeholder="Search name, email, organization or state" aria-label="Search leads" />
            <select name="segment" defaultValue={f.segment || ""} aria-label="Segment">
              <option value="">All segments</option>
              {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.short}</option>)}
            </select>
            <select name="owner" defaultValue={f.owner || ""} aria-label="Owner">
              <option value="">Any owner</option>
              <option value="labb">Labb owned</option>
              <option value="partner">Passed to partner</option>
            </select>
            <select name="partner" defaultValue={f.partner || ""} aria-label="Partner">
              <option value="">Any partner</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.clinic || p.name}</option>)}
            </select>
            <select name="status" defaultValue={f.status || ""} aria-label="Status">
              <option value="">Any status</option>
              {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select name="archived" defaultValue={f.archived || ""} aria-label="Archived">
              <option value="">Open</option>
              <option value="yes">Archived</option>
              <option value="all">Open and archived</option>
            </select>
            <button className="btn btn-outline-dark" type="submit">Filter</button>
            <a className="btn btn-outline" href={`/api/admin/leads/export${qs ? `?${qs}` : ""}`}>Export CSV</a>
          </form>

          <div className="compare-wrap" style={{ marginTop: 18 }}>
            <table className="compare admin-table">
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left" }}>Lead</th>
                  <th scope="col">Segment</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Status</th>
                  <th scope="col">Received</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id}>
                    <th scope="row">
                      <Link href={`/admin/leads/${l.id}`}>{leadName(l)}</Link>
                      {l.archived && <span className="tag plain" style={{ marginLeft: 8 }}>Archived</span>}
                      <span className="sub">{[l.company, l.email, l.state].filter(Boolean).join(" · ")}</span>
                      {l.products && <span className="sub">Interested in: {l.products}</span>}
                    </th>
                    <td>{segmentLabel(l.segment)}</td>
                    <td>{l.owner === "partner" ? (l.partner_clinic || l.partner_name || "Partner") : "Labb"}</td>
                    <td><span className={`status s-${l.status}`}>{statusLabel(l.status)}</span></td>
                    <td>{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={5}>No leads match.</td></tr>}
              </tbody>
            </table>
          </div>
          {rows.length === 500 && <p className="fine">Showing the newest 500. Narrow the filters or export to see more.</p>}
        </div>
      </section>
    </>
  );
}
