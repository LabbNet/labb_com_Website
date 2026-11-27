import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { money, QUOTE_STATUS, quoteNumber, totals, type QuoteItem } from "@/lib/salesQuotes";

export const metadata: Metadata = { title: "Quotes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Every Labb sales quote, newest first. Quotes are started from a lead's Quotes tab.
export default async function SalesQuotes({ searchParams }: { searchParams: Promise<{ status?: string; mine?: string }> }) {
  const me = await requireAdmin("/admin/sales-quotes");
  const sp = await searchParams;
  const status = sp.status && QUOTE_STATUS[sp.status] ? sp.status : "";
  const mine = sp.mine === "1";
  const db = sql();
  const [rows, flash, counts] = await Promise.all([
    db<{ id: string; title: string; status: string; kind: string; created_at: Date; sent_at: Date | null; last_opened_at: Date | null; open_count: number; expires_on: Date; lead_id: string; first_name: string | null; last_name: string | null; company: string | null; email: string; rep: string | null; paid_cents: number | null; member_id: string | null; clinic: string | null; saas_term: string }[]>`
      select q.id, q.title, q.status, q.kind, q.created_at, q.sent_at, q.last_opened_at, q.open_count, q.expires_on, q.paid_cents, l.id as lead_id, l.first_name, l.last_name, l.company, l.email, m.name as rep, q.member_id, m.clinic, q.saas_term
      from sales_quotes q join leads l on l.id = q.lead_id left join members m on m.id = q.rep_id
      where (${status} = '' or q.status = ${status}) and (${mine} = false or q.rep_id = ${me.id}) order by q.updated_at desc limit 300`,
    readFlash(),
    db<{ status: string; n: number }[]>`select status, count(*)::int as n from sales_quotes group by status`,
  ]);
  const items = rows.length ? await db<(QuoteItem & { quote_id: string })[]>`select * from sales_quote_items where quote_id = any(${rows.map((r) => r.id)}::bigint[])` : [];
  const due = (id: string) => totals(items.filter((i) => String(i.quote_id) === String(id)), rows.find((r) => String(r.id) === String(id))?.saas_term).dueToday;
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  return (
    <>
      <AdminBar title="Quotes" current="/admin/sales-quotes" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
            <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Quotes</h1>
            <span style={{ display: "flex", gap: 8 }}><Link href="/admin/sales-quotes/prices" className="btn btn-outline-dark btn-sm">Quote prices</Link><Link href="/admin/sales-quotes/templates" className="btn btn-outline-dark btn-sm">Quote templates</Link></span>
          </div>
          <p style={{ marginTop: 6 }}>Start a quote from a lead&apos;s <strong>Quotes</strong> tab. Leads open it on labb.com, adjust quantities, sign and pay what&apos;s due today.</p>
          <div className="stats" style={{ margin: "16px 0" }}>
            {(["draft", "sent", "viewed", "signed", "paid"] as const).map((s) => (
              <Link key={s} href={`/admin/sales-quotes?status=${s}`} className="stat" style={{ textDecoration: "none", color: "inherit" }}><strong>{n(s)}</strong><span>{QUOTE_STATUS[s]}</span></Link>
            ))}
          </div>
          <form className="admin-search" method="get" style={{ marginBottom: 12 }}>
            <select name="status" defaultValue={status} aria-label="Status">
              <option value="">All statuses</option>
              {Object.entries(QUOTE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label className="fine" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><input type="checkbox" name="mine" value="1" defaultChecked={mine} /> My quotes</label>
            <button className="btn btn-primary" type="submit">Filter</button>
          </form>
          <div className="hero-card" style={{ overflowX: "auto" }}>
            <table className="meet-table">
              <thead><tr><th>Quote</th><th>Lead</th><th>Status</th><th>Due today</th><th>Opened</th><th>Rep</th></tr></thead>
              <tbody>
                {!rows.length && <tr><td colSpan={6}>No quotes yet.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/admin/sales-quotes/${r.id}`}><strong>{quoteNumber(r)}</strong></Link><br /><span className="fine">{r.title}</span></td>
                    <td><Link href={`/admin/leads/${r.lead_id}?tab=quotes`}>{[r.first_name, r.last_name].filter(Boolean).join(" ") || r.email}</Link>{r.company && <><br /><span className="fine">{r.company}</span></>}</td>
                    <td><span className={`qs qs-${r.status}`}>{QUOTE_STATUS[r.status]}</span>{r.sent_at && <><br /><span className="fine">Sent {fmtDate(r.sent_at)}</span></>}</td>
                    <td>{r.paid_cents != null ? <>{money(r.paid_cents)} <span className="fine">paid</span></> : money(due(r.id))}</td>
                    <td>{r.open_count ? <>{r.open_count}× <br /><span className="fine">last {fmtDate(r.last_opened_at)}</span></> : <span className="fine">Not yet</span>}</td>
                    <td>{r.rep}{r.member_id && <><br /><span className="tag plain">CPP{r.clinic ? `: ${r.clinic}` : ""}</span></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
