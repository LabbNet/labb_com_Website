import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { findLeads, partnerOptions, type LeadFilters } from "@/lib/leadQuery";
import { leadName } from "@/lib/leads";
import { openDupeCount } from "@/lib/dupes";
import { LEAD_STATUSES, SEGMENTS, segmentLabel, statusLabel } from "@/lib/segments";

export const metadata: Metadata = { title: "Leads", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLeads({ searchParams }: { searchParams: Promise<LeadFilters> }) {
  await requireAdmin("/admin/leads");
  const f = await searchParams;
  const [allRows, partners, counts, flash, dupRows, review, clients] = await Promise.all([
    findLeads(f),
    partnerOptions(),
    sql()<{ segment: string; n: number; fresh: number }[]>`
      select segment, count(*)::int as n, count(*) filter (where status = 'new')::int as fresh from leads where not archived and not existing_client group by segment`,
    readFlash(),
    sql()<{ email: string; n: number }[]>`select lower(email) as email, count(*)::int as n from leads group by lower(email) having count(*) > 1`,
    openDupeCount(),
    sql()<{ n: number }[]>`select count(*)::int as n from leads where existing_client and not archived`.then((r) => r[0].n),
  ]);
  // People who filled in a form more than once: flagged in the list and filterable, merged from the lead page.
  const dupCount = new Map(dupRows.map((d) => [d.email, d.n]));
  const showDups = (f as Record<string, string | undefined>).dups === "1";
  const rows = showDups ? allRows.filter((l) => dupCount.has(l.email.toLowerCase())) : allRows;
  const bySeg = Object.fromEntries(counts.map((c) => [c.segment, c]));
  const total = counts.reduce((a, c) => a + c.n, 0);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <AdminBar title="Website leads" current="/admin/leads" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <div className="leads-top">
            {review > 0 ? <Link href="/admin/leads/duplicates" className="dup-alert"><strong>{review}</strong> possible {review === 1 ? "duplicate" : "duplicates"} to review</Link> : <Link href="/admin/leads/duplicates" className="fine">Possible duplicates</Link>}
            <Link href="/admin/leads/new" className="btn btn-outline btn-sm">+ Add a lead</Link>
          </div>
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
            <select name="client" defaultValue={f.client || ""} aria-label="Existing clients">
              <option value="">Prospects</option>
              <option value="yes">Existing clients{clients ? ` (${clients})` : ""}</option>
              <option value="all">Prospects and existing clients</option>
            </select>
            <label className="fine" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="checkbox" name="dups" value="1" defaultChecked={showDups} /> Duplicates only{dupRows.length ? ` (${dupRows.length})` : ""}</label>
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
                      {l.existing_client && l.status !== "existing-client" && <span className="tag plain client-tag" style={{ marginLeft: 8 }}>Existing client</span>}
                      {dupCount.has(l.email.toLowerCase()) && <span className="dup-badge" title="This person submitted more than once. Open the lead to merge.">{dupCount.get(l.email.toLowerCase())} submissions</span>}
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
