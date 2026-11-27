import type { Metadata } from "next";
import { Flash } from "@/components/AdminBar";
import { fmtDate, readFlash } from "@/lib/admin";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { leadName, type LeadRow } from "@/lib/leads";
import { LEAD_STATUSES, MEMBER_LEAD_SEGMENTS, segmentLabel, statusLabel } from "@/lib/segments";
import { quotesFor } from "@/lib/quotes";
import { PRICE_CATEGORIES } from "@/lib/cppPricing";
import { QuoteForm, type QuoteProduct } from "@/components/QuoteForm";
import { QuoteList } from "@/components/QuoteList";
import { CPP_SEQUENCES, runsForLeads, sequenceName, STEP_DAYS } from "@/lib/sequences";

export const metadata: Metadata = { title: "My leads", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Leads Labb has passed to this CPP member. Partners can update status and add notes; Labb sees every change.
export default async function MemberLeads() {
  const m = (await currentMember())!; // layout guarantees a signed-in member
  const [rows, flash] = await Promise.all([
    sql()<LeadRow[]>`select * from leads where partner_id = ${m.id} and owner = 'partner' and not archived order by passed_at desc nulls last, created_at desc`,
    readFlash(),
  ]);
  const runs = await runsForLeads(rows.map((l) => String(l.id)));
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
        <div className="leads-head">
          <div>
            <h1 style={{ fontSize: "1.8rem", margin: 0 }}>My leads</h1>
            <p style={{ margin: "6px 0 0" }}>Leads Labb passes to you and leads you add yourself. Contact each one promptly and keep its status current so Labb knows how it went.</p>
          </div>
          <a href="#add" className="btn btn-primary">+ Add a lead</a>
        </div>
        <Flash flash={flash} />
        <details className="hero-card add-lead" id="add">
          <summary><strong>Add a lead</strong><span className="fine">Found a prospect yourself? Add it here so it&apos;s registered to you and Labb can support the deal.</span></summary>
          <form action="/api/members/leads" method="post" style={{ marginTop: 16 }}>
            <input type="hidden" name="action" value="add" />
            <div className="fields">
              <div className="field full"><label htmlFor="al-co">Organization<span className="req">*</span></label><input id="al-co" name="company" required maxLength={160} autoComplete="organization" /></div>
              <div className="field"><label htmlFor="al-fn">Contact first name<span className="req">*</span></label><input id="al-fn" name="first_name" required maxLength={80} /></div>
              <div className="field"><label htmlFor="al-ln">Last name</label><input id="al-ln" name="last_name" maxLength={80} /></div>
              <div className="field"><label htmlFor="al-em">Email<span className="req">*</span></label><input id="al-em" name="email" type="email" required maxLength={200} /></div>
              <div className="field"><label htmlFor="al-ph">Phone</label><input id="al-ph" name="phone" type="tel" maxLength={40} /></div>
              <div className="field"><label htmlFor="al-ci">City</label><input id="al-ci" name="city" maxLength={80} /></div>
              <div className="field"><label htmlFor="al-st">State</label><input id="al-st" name="state" maxLength={40} /></div>
              <div className="field">
                <label htmlFor="al-sg">Type of organization</label>
                <select id="al-sg" name="segment" defaultValue="employer">
                  {MEMBER_LEAD_SEGMENTS.map((sg) => <option key={sg} value={sg}>{segmentLabel(sg)}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="al-vo">Estimated tests per month</label><input id="al-vo" name="volume" maxLength={60} placeholder="For example: 40" /></div>
              <div className="field full"><label htmlFor="al-pr">Interested in</label><input id="al-pr" name="products" maxLength={300} placeholder="For example: rapid urine testing, background checks, LabbHR" /></div>
              <div className="field full">
                <label htmlFor="al-sq">Send a free guidebook (optional)</label>
                <select id="al-sq" name="sequence" defaultValue="">
                  <option value="">Don&apos;t send anything yet</option>
                  {CPP_SEQUENCES.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
                </select>
                <span className="fine">Five emails over {STEP_DAYS[STEP_DAYS.length - 1]} days from your clinic, via Labb: the guidebook, three articles and a follow-up. Replies come to you.</span>
              </div>
              <div className="field full"><label htmlFor="al-ms">Notes</label><textarea id="al-ms" name="message" maxLength={2000} placeholder="Where the opportunity stands, decision maker, timing" /></div>
            </div>
            <button className="btn btn-primary" type="submit" style={{ marginTop: 16 }}>Add lead</button>
            <p className="fine" style={{ textAlign: "left", marginTop: 10 }}>Labb is notified of every lead you add. Customers in the CPP are Labb customers, served through you.</p>
          </form>
        </details>
        {!rows.length && <p className="hero-card">No leads yet. Labb will pass leads to you here, and you can add your own above.</p>}
        <div style={{ display: "grid", gap: 20 }}>
          {rows.map((l) => (
            <div className="hero-card" key={l.id} id={`lead-${l.id}`}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", margin: 0 }}>{leadName(l)}</h2>
                  <span className="fine">{segmentLabel(l.segment)} · {l.type === "partner-added" ? "added" : "passed"} {fmtDate(l.passed_at)} ET</span>
                </div>
                <span className={`status s-${l.status}`} style={{ alignSelf: "flex-start" }}>{statusLabel(l.status)}</span>
              </div>
              {l.type !== "partner-added" && (l.accepted_at ? (
                <p className="fine" style={{ textAlign: "left", margin: "10px 0 0" }}>You accepted this lead {fmtDate(l.accepted_at)} ET. Labb emailed {l.email} to expect your email.</p>
              ) : (
                <form action="/api/members/leads" method="post" className="accept-lead">
                  <input type="hidden" name="action" value="accept" />
                  <input type="hidden" name="id" value={l.id} />
                  <button className="btn btn-primary" type="submit">Accept lead</button>
                  <span className="fine">Labb will email {l.email} that you&apos;ll be contacting them and to watch for your email from {m.email}.</span>
                </form>
              ))}
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
              <details className="lead-pass" open={runs.some((r) => r.lead_id === String(l.id))}>
                <summary>Send a free guidebook</summary>
                <form action="/api/members/leads" method="post" className="lead-pass-form">
                  <input type="hidden" name="action" value="sequence" />
                  <input type="hidden" name="id" value={l.id} />
                  <label htmlFor={`sq-${l.id}`} className="sr-only">Guidebook</label>
                  <select id={`sq-${l.id}`} name="sequence" required defaultValue="">
                    <option value="" disabled>Choose a guidebook</option>
                    {CPP_SEQUENCES.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
                  </select>
                  <button className="btn btn-outline-dark" type="submit">Start emails</button>
                </form>
                <p className="fine">Five emails to {l.email} over {STEP_DAYS[STEP_DAYS.length - 1]} days, sent from your clinic via Labb. Replies come to you.</p>
                {runs.filter((r) => r.lead_id === String(l.id)).length > 0 && (
                  <ul className="seq-runs">
                    {runs.filter((r) => r.lead_id === String(l.id)).map((r) => (
                      <li key={r.id}>
                        <span><strong>{sequenceName(r.sequence)}</strong> <span className={`status s-${r.status === "active" ? "contacted" : r.status === "completed" ? "won" : "lost"}`}>{r.status}</span></span>
                        <span className="fine">{r.sent} of {STEP_DAYS.length} sent{r.next_due ? ` · next ${fmtDate(r.next_due)}` : ""} · started {fmtDate(r.created_at)}</span>
                        {r.status === "active" && (
                          <form action="/api/members/leads" method="post">
                            <input type="hidden" name="action" value="sequence-stop" />
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="run" value={r.id} />
                            <button className="linkish" type="submit">Stop</button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
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
                <h3>Quotes <span className="fine">· send a quote to the client, or record one you gave them yourself for Labb&apos;s pricing reports.</span></h3>
                <QuoteList quotes={quotes.filter((q) => q.lead_id === String(l.id))} />
                <form action="/api/members/sales-quotes" method="post" style={{ display: "inline-block", marginRight: 10 }}>
                  <input type="hidden" name="action" value="create" /><input type="hidden" name="lead" value={l.id} />
                  <button className="btn btn-primary" type="submit">Send a quote to this client</button>
                </form>
                <details className="quote-add">
                  <summary className="btn btn-outline-dark">+ Record a quote</summary>
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
