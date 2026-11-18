import type { Metadata } from "next";
import { Flash } from "@/components/AdminBar";
import { fmtDate, readFlash } from "@/lib/admin";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { leadName, type LeadRow } from "@/lib/leads";
import { LEAD_STATUSES, segmentLabel, statusLabel } from "@/lib/segments";
import { quotesFor } from "@/lib/quotes";
import { PRICE_CATEGORIES } from "@/lib/cppPricing";
import { QuoteForm, type QuoteProduct } from "@/components/QuoteForm";
import { QuoteList } from "@/components/QuoteList";

export const metadata: Metadata = { title: "My leads", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Leads Labb has passed to this CPP member. Partners can update status and add notes; Labb sees every change.
export default async function MemberLeads() {
  const m = (await currentMember())!; // layout guarantees a signed-in member
  const [rows, flash] = await Promise.all([
    sql()<LeadRow[]>`select * from leads where partner_id = ${m.id} and owner = 'partner' and not archived order by passed_at desc nulls last, created_at desc`,
    readFlash(),
  ]);
  const quotes = rows.length ? await quotesFor({ memberId: m.id, leadIds: rows.map((l) => String(l.id)) }) : [];
  const products = (await sql()<{ id: string; name: string; sku: string | null; unit: string | null; category: string; sl1_msrp_cents: number | null }[]>`
    select id, name, sku, unit, category, sl1_msrp_cents from cpp_price_items where active order by category, sort, lower(name)`)
    .map((p): QuoteProduct => ({ id: String(p.id), name: p.name, sku: p.sku, unit: p.unit, category: p.category, msrpCents: p.sl1_msrp_cents }));
  const groups = PRICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }));
  const others = await sql()<{ id: string; name: string; clinic: string | null }[]>`
    select id, name, clinic from members where id <> ${m.id} and role = 'member' and status = 'active' and cpp_status = 'active' order by lower(coalesce(clinic, name))`;

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
              {others.length > 0 && (
                <details className="lead-pass">
                  <summary>Pass this lead to another CPP member</summary>
                  <form action="/api/members/leads" method="post" className="lead-pass-form">
                    <input type="hidden" name="action" value="pass" />
                    <input type="hidden" name="id" value={l.id} />
                    <label htmlFor={`pp-${l.id}`} className="sr-only">CPP member</label>
                    <select id={`pp-${l.id}`} name="partner" required defaultValue="">
                      <option value="" disabled>Choose a CPP member</option>
                      {others.map((o) => <option key={o.id} value={o.id}>{o.clinic ? `${o.clinic} (${o.name})` : o.name}</option>)}
                    </select>
                    <button className="btn btn-outline-dark" type="submit">Pass lead</button>
                  </form>
                  <p className="fine">The lead moves to their account and they&apos;re emailed. Your quotes for it stay in My quotes.</p>
                </details>
              )}
              <div className="lead-quotes">
                <h3>Quotes <span className="fine">· for your records and Labb&apos;s pricing reports. Never sent to the client.</span></h3>
                <QuoteList quotes={quotes.filter((q) => q.lead_id === String(l.id))} />
                <details className="quote-add">
                  <summary className="btn btn-primary">+ Record a quote</summary>
                  <QuoteForm leadId={String(l.id)} products={products} groups={groups} />
                </details>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
