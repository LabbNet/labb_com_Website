import type { Metadata } from "next";
import Link from "next/link";
import { AdminBar } from "@/components/AdminBar";
import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { PRICE_CATEGORIES } from "@/lib/cppPricing";
import { QUOTE_STATUSES, quoteStatusLabel } from "@/lib/quotes";
import { segmentLabel } from "@/lib/segments";

export const metadata: Metadata = { title: "Quote analytics", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const money = (c: number | null) => (c == null ? "" : (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }));
type SP = { product?: string; category?: string; state?: string; industry?: string; status?: string; days?: string };

// Quotes CPP members record for leads Labb passed them, summarized for pricing analysis.
export default async function QuoteAnalytics({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin("/admin/quotes");
  const sp = await searchParams;
  const product = /^\d+$/.test(sp.product || "") ? sp.product! : "";
  const category = PRICE_CATEGORIES.some((c) => c.value === sp.category) || sp.category === "other" ? sp.category! : "";
  const state = (sp.state || "").toUpperCase().slice(0, 40);
  const industry = (sp.industry || "").slice(0, 80);
  const status = QUOTE_STATUSES.some((s) => s.value === sp.status) ? sp.status! : "";
  const days = ["30", "90", "365"].includes(sp.days || "") ? Number(sp.days) : 0;
  const db = sql();

  // Quote rows that pass the filters (industry falls back to the lead's segment).
  const base = db`
    select q.*, coalesce(nullif(q.industry, ''), q.segment) as ind from member_quotes q
    where (${state} = '' or q.state = ${state})
      and (${industry} = '' or coalesce(nullif(q.industry, ''), q.segment) = ${industry})
      and (${status} = '' or q.status = ${status})
      and (${days} = 0 or q.quoted_on >= current_date - ${days}::int)`;

  const forecastQ = db<{ key: string; product_name: string; category: string | null; accepted: string; pipeline: string; quotes: number }[]>`
      with f as (${base})
      select coalesce(i.price_item_id::text, 'other:' || lower(i.product_name)) as key, min(i.product_name) as product_name, min(i.category) as category,
        coalesce(sum(i.monthly_volume) filter (where f.status = 'accepted'), 0)::bigint as accepted,
        coalesce(sum(i.monthly_volume) filter (where f.status in ('sent', 'draft')), 0)::bigint as pipeline,
        count(distinct f.id)::int as quotes
      from f join member_quote_items i on i.quote_id = f.id
      where i.monthly_volume is not null and (${category} = '' or i.category = ${category}) and (${product} = '' or i.price_item_id::text = ${product})
      group by 1 order by accepted desc, pipeline desc`;
  const [byProduct, byState, byIndustry, recent, opts, forecast] = await Promise.all([
    db<{ key: string; product_name: string; sku: string | null; quotes: number; units: string; avg_cents: number; wavg_cents: number; min_cents: number; max_cents: number; msrp_cents: number | null }[]>`
      with f as (${base})
      select coalesce(i.price_item_id::text, 'other:' || lower(i.product_name)) as key, min(i.product_name) as product_name, min(i.sku) as sku,
        count(distinct f.id)::int as quotes, sum(i.quantity)::bigint as units,
        round(avg(i.unit_price_cents))::int as avg_cents, round(sum(i.unit_price_cents::bigint * i.quantity) / nullif(sum(i.quantity), 0))::int as wavg_cents,
        min(i.unit_price_cents) as min_cents, max(i.unit_price_cents) as max_cents, min(p.sl1_msrp_cents) as msrp_cents
      from f join member_quote_items i on i.quote_id = f.id left join cpp_price_items p on p.id = i.price_item_id
      where (${category} = '' or i.category = ${category}) and (${product} = '' or i.price_item_id::text = ${product})
      group by 1 order by quotes desc, product_name`,
    db<{ key: string | null; quotes: number; avg_quote_cents: number; avg_unit_cents: number | null }[]>`
      with f as (${base})
      select f.state as key, count(*)::int as quotes, round(avg(f.total_cents))::int as avg_quote_cents,
        (select round(sum(i.unit_price_cents::bigint * i.quantity) / nullif(sum(i.quantity), 0))::int from member_quote_items i join member_quotes q2 on q2.id = i.quote_id
          where ${product} <> '' and i.price_item_id::text = ${product} and q2.id in (select id from f f2 where f2.state is not distinct from f.state)) as avg_unit_cents
      from f group by f.state order by quotes desc`,
    db<{ key: string | null; quotes: number; avg_quote_cents: number; avg_unit_cents: number | null }[]>`
      with f as (${base})
      select f.ind as key, count(*)::int as quotes, round(avg(f.total_cents))::int as avg_quote_cents,
        (select round(sum(i.unit_price_cents::bigint * i.quantity) / nullif(sum(i.quantity), 0))::int from member_quote_items i
          where ${product} <> '' and i.price_item_id::text = ${product} and i.quote_id in (select id from f f2 where f2.ind is not distinct from f.ind)) as avg_unit_cents
      from f group by f.ind order by quotes desc`,
    db<{ id: string; quoted_on: string; status: string; total_cents: number; state: string | null; ind: string | null; member: string; lead_id: string; lead: string }[]>`
      with f as (${base})
      select f.id, to_char(f.quoted_on, 'Mon FMDD, YYYY') as quoted_on, f.status, f.total_cents, f.state, f.ind,
        coalesce(m.clinic, m.name) as member, f.lead_id, coalesce(l.company, l.email) as lead
      from f join members m on m.id = f.member_id join leads l on l.id = f.lead_id order by f.created_at desc limit 50`,
    db<{ kind: string; v: string }[]>`
      select 'state' as kind, state as v from member_quotes where state is not null
      union select 'industry', coalesce(nullif(industry, ''), segment) from member_quotes where coalesce(nullif(industry, ''), segment) is not null
      union select 'product', price_item_id::text || '|' || min(product_name) from member_quote_items where price_item_id is not null group by price_item_id
      order by 1, 2`,
    forecastQ,
  ]);
  const catLabel = (v: string | null) => PRICE_CATEGORIES.find((c) => c.value === v)?.label ?? "Other";
  const byCat = Object.values(forecast.reduce<Record<string, { label: string; accepted: number; pipeline: number }>>((acc, r) => {
    const k = r.category || "other";
    acc[k] ??= { label: catLabel(r.category), accepted: 0, pipeline: 0 };
    acc[k].accepted += Number(r.accepted); acc[k].pipeline += Number(r.pipeline);
    return acc;
  }, {}));
  const states = opts.filter((o) => o.kind === "state").map((o) => o.v);
  const industries = opts.filter((o) => o.kind === "industry").map((o) => o.v);
  const products = opts.filter((o) => o.kind === "product").map((o) => { const [id, ...n] = o.v.split("|"); return { id, name: n.join("|") }; });
  const indLabel = (v: string | null) => (!v ? "Not given" : industries.includes(v) && /^[a-z-]+$/.test(v) ? segmentLabel(v) : v);
  const totalQuotes = byState.reduce((t, r) => t + r.quotes, 0);

  return (
    <>
      <AdminBar title="Quote analytics" current="/admin/quotes" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <p className="lede" style={{ marginTop: 0 }}>Quotes CPP members record for leads Labb passed them. Members never send these to clients; they&apos;re here for tracking and pricing analysis.</p>
          <form method="get" className="admin-search qa-filters">
            <select name="product" defaultValue={product} aria-label="Product">
              <option value="">All products</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select name="category" defaultValue={category} aria-label="Category">
              <option value="">All categories</option>
              {PRICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              <option value="other">Other products</option>
            </select>
            <select name="state" defaultValue={state} aria-label="Region">
              <option value="">All regions</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select name="industry" defaultValue={industry} aria-label="Industry">
              <option value="">All industries</option>
              {industries.map((s) => <option key={s} value={s}>{indLabel(s)}</option>)}
            </select>
            <select name="status" defaultValue={status} aria-label="Status">
              <option value="">Any status</option>
              {QUOTE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select name="days" defaultValue={days ? String(days) : ""} aria-label="Date range">
              <option value="">All time</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </select>
            <button className="btn btn-outline-dark" type="submit">Apply</button>
          </form>

          {!totalQuotes ? (
            <p className="hero-card" style={{ marginTop: 24 }}>No quotes match. CPP members record quotes from My leads once Labb passes them a lead.</p>
          ) : (
            <>
              <h2 className="qa-h">Average price by product</h2>
              <div className="compare-wrap">
                <table className="compare admin-table">
                  <thead><tr><th scope="col" style={{ textAlign: "left" }}>Product</th><th scope="col">Quotes</th><th scope="col">Units</th><th scope="col">Avg unit price</th><th scope="col">Weighted by units</th><th scope="col">Low to high</th><th scope="col">SL1 MSRP</th></tr></thead>
                  <tbody>
                    {byProduct.map((r) => (
                      <tr key={r.key}>
                        <th scope="row">{r.product_name}{r.sku && <span className="sub">{r.sku}</span>}</th>
                        <td>{r.quotes}</td>
                        <td>{Number(r.units).toLocaleString()}</td>
                        <td><strong>{money(r.avg_cents)}</strong></td>
                        <td>{money(r.wavg_cents)}</td>
                        <td>{money(r.min_cents)} to {money(r.max_cents)}</td>
                        <td>{money(r.msrp_cents) || "n/a"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h2 className="qa-h">Testing volume forecast (per month)</h2>
              <p className="fine" style={{ marginTop: -6 }}>Expected monthly volume from member quotes. Accepted quotes are committed; sent and draft quotes are pipeline.</p>
              <div className="qa-split">
                <div className="compare-wrap">
                  <table className="compare admin-table">
                    <thead><tr><th scope="col" style={{ textAlign: "left" }}>Product type</th><th scope="col">Accepted</th><th scope="col">Pipeline</th><th scope="col">Total</th></tr></thead>
                    <tbody>
                      {byCat.map((r) => <tr key={r.label}><th scope="row">{r.label}</th><td><strong>{r.accepted.toLocaleString()}</strong></td><td>{r.pipeline.toLocaleString()}</td><td>{(r.accepted + r.pipeline).toLocaleString()}</td></tr>)}
                      {!byCat.length && <tr><td colSpan={4}>No expected volumes recorded yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="compare-wrap">
                  <table className="compare admin-table">
                    <thead><tr><th scope="col" style={{ textAlign: "left" }}>Product</th><th scope="col">Accepted</th><th scope="col">Pipeline</th><th scope="col">Quotes</th></tr></thead>
                    <tbody>
                      {forecast.map((r) => <tr key={r.key}><th scope="row">{r.product_name}</th><td><strong>{Number(r.accepted).toLocaleString()}</strong></td><td>{Number(r.pipeline).toLocaleString()}</td><td>{r.quotes}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="qa-split">
                <div>
                  <h2 className="qa-h">By region</h2>
                  <div className="compare-wrap">
                    <table className="compare admin-table">
                      <thead><tr><th scope="col" style={{ textAlign: "left" }}>State</th><th scope="col">Quotes</th><th scope="col">Avg quote</th>{product && <th scope="col">Avg unit price</th>}</tr></thead>
                      <tbody>
                        {byState.map((r) => (
                          <tr key={r.key ?? "none"}><th scope="row">{r.key || "Not given"}</th><td>{r.quotes}</td><td>{money(r.avg_quote_cents)}</td>{product && <td><strong>{money(r.avg_unit_cents) || "n/a"}</strong></td>}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h2 className="qa-h">By industry</h2>
                  <div className="compare-wrap">
                    <table className="compare admin-table">
                      <thead><tr><th scope="col" style={{ textAlign: "left" }}>Industry</th><th scope="col">Quotes</th><th scope="col">Avg quote</th>{product && <th scope="col">Avg unit price</th>}</tr></thead>
                      <tbody>
                        {byIndustry.map((r) => (
                          <tr key={r.key ?? "none"}><th scope="row">{indLabel(r.key)}</th><td>{r.quotes}</td><td>{money(r.avg_quote_cents)}</td>{product && <td><strong>{money(r.avg_unit_cents) || "n/a"}</strong></td>}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {!product && <p className="fine">Pick a product above to see its average unit price by region and industry.</p>}

              <h2 className="qa-h">Recent quotes</h2>
              <div className="compare-wrap">
                <table className="compare admin-table">
                  <thead><tr><th scope="col" style={{ textAlign: "left" }}>Lead</th><th scope="col">CPP member</th><th scope="col">Date</th><th scope="col">Region</th><th scope="col">Industry</th><th scope="col">Status</th><th scope="col">Total</th></tr></thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id}>
                        <th scope="row"><Link href={`/admin/leads/${r.lead_id}`}>{r.lead}</Link><span className="sub">Quote #{r.id}</span></th>
                        <td>{r.member}</td><td>{r.quoted_on}</td><td>{r.state || ""}</td><td>{indLabel(r.ind)}</td><td>{quoteStatusLabel(r.status)}</td><td><strong>{money(r.total_cents)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
