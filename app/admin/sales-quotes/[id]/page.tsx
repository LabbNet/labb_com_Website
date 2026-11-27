import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { CopyLink } from "@/components/CopyLink";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { leadName, type LeadRow } from "@/lib/leads";
import {
  aiReady, BILLING_LABEL, QUOTE_SECTIONS, sectionOf, syncCatalogLines, KIT_BOX, leadCanEdit, lineCents, packOf, billingFor, priceFor, type PriceRow, getQuote, money, PRICE_LEVELS, QUOTE_KINDS, QUOTE_PRICE_CATEGORIES, QUOTE_STATUS, quoteNumber, quoteUrl, repFor, totals,
} from "@/lib/salesQuotes";

export const metadata: Metadata = { title: "Quote", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Quote builder: line items, prices and quantities, AI edits, layout, versions, approve and send.
export default async function QuoteEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/sales-quotes/${id}`);
  await syncCatalogLines(id);
  const data = await getQuote(id);
  if (!data) notFound();
  const { q, items } = data;
  const db = sql();
  const [[lead], rep, flash, admins, catalog, templates, versions] = await Promise.all([
    db<LeadRow[]>`select * from leads where id = ${q.lead_id}`,
    repFor(q),
    readFlash(),
    db<{ id: string; name: string }[]>`select id, name from members where role = 'admin' and status <> 'disabled' order by name`,
    db<(PriceRow & { id: string })[]>`select * from quote_price_items where active order by sort, name`,
    db<{ id: string; name: string }[]>`select id::text, name from quote_templates where active order by name`,
    db<{ id: string; summary: string | null; prompt: string | null; created_at: Date; by: string | null }[]>`
      select v.id::text, v.summary, v.prompt, v.created_at, m.name as by from sales_quote_versions v left join members m on m.id = v.created_by
      where v.quote_id = ${q.id} order by v.created_at desc limit 5`,
  ]);
  if (!lead) notFound();
  const t = totals(items);
  type Row = { kind: "item"; i: (typeof items)[number]; cat: string | null };
  const secOrder = (k: string) => QUOTE_SECTIONS.findIndex((x) => x.key === k);
  const rows: Row[] = items.map((i, n) => ({ kind: "item" as const, i, cat: sectionOf(i) as string, n })).sort((a, b) => secOrder(a.cat) - secOrder(b.cat) || a.n - b.n);
  const locked = q.status === "signed" || q.status === "paid";
  const kind = QUOTE_KINDS.find((k) => k.value === q.kind)!;
  const expires = new Date(q.expires_on).toISOString().slice(0, 10);
  const act = (action: string, children: React.ReactNode, cls = "") => (
    <form action="/api/admin/sales-quotes" method="post" className={cls}>
      <input type="hidden" name="action" value={action} /><input type="hidden" name="quote" value={q.id} />
      {children}
    </form>
  );
  const catLabel = (c: string | null) => QUOTE_SECTIONS.find((x) => x.key === c)?.title ?? QUOTE_PRICE_CATEGORIES.find((x) => x.value === c)?.label ?? "Other";

  return (
    <>
      <AdminBar title="Quote" current="/admin/sales-quotes" />
      <section className="section qb" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <p style={{ margin: "0 0 12px" }}><Link href={`/admin/leads/${lead.id}?tab=quotes`}>← {leadName(lead)}</Link> · <Link href="/admin/sales-quotes">All quotes</Link></p>
          <Flash flash={flash} />
          <header className="qb-head">
            <div>
              <span className="lp-eyebrow">{quoteNumber(q)} · {kind.label} quote · created {fmtDate(q.created_at)}</span>
              <h1>{q.title}</h1>
              <p className="lp-org">{leadName(lead)}{lead.company ? `, ${lead.company}` : ""} · {lead.email}</p>
              <p className="lp-chips"><span className={`qs qs-${q.status}`}>{QUOTE_STATUS[q.status]}</span>
                {q.sent_at && <span className="tag plain">Sent {fmtDate(q.sent_at)}</span>}
                <span className="tag plain">{q.open_count ? `Opened ${q.open_count}× · last ${fmtDate(q.last_opened_at)}` : "Not opened yet"}</span>
                <span className="tag plain">Valid until {new Date(q.expires_on).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</span></p>
            </div>
            <div className="qb-due">
              <span>Due at acceptance</span><strong>{money(t.dueToday)}</strong>
              <em>{money(t.once)} one time{t.monthly ? ` + ${money(t.monthly)} first month of software` : ""}</em>
              <a href={`/quote/${q.token}?preview=1`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm qb-view">View quote</a>
              {q.status !== "draft" && <div style={{ marginTop: 8 }}><CopyLink url={quoteUrl(q.token)} label="Copy the lead's quote link" /></div>}
            </div>
          </header>

          {locked && (
            <div className="hero-card qb-signed">
              <h2>{q.status === "paid" ? "Accepted, signed and paid" : "Signed, waiting for payment"}</h2>
              <p>Signed by <strong>{q.signed_name}</strong>{q.signed_title ? `, ${q.signed_title}` : ""} on {fmtDate(q.signed_at)} ET from {q.signed_ip || "unknown IP"}.</p>
              {q.signature_png && /^data:image\/png;base64,/.test(q.signature_png) && <img src={q.signature_png} alt={`Signature of ${q.signed_name}`} className="qb-sig" />}
              {q.paid_at && <p>Paid {money(q.paid_cents || 0)} on {fmtDate(q.paid_at)} ET{q.stripe_session ? ` (Stripe ${q.stripe_session.slice(0, 24)}…)` : ""}.</p>}
              <p className="fine" style={{ textAlign: "left" }}>Record of what was signed: {q.signed_hash?.slice(0, 16)}. This quote is locked; duplicate it to make changes.</p>
              {act("duplicate", <button className="btn btn-outline-dark btn-sm" type="submit">Duplicate into a new draft</button>)}
            </div>
          )}

          <div className="qb-tools">
              {!locked && (
                <div className="hero-card qb-send">
                  <h3>{q.status === "draft" ? "Approve and send" : "Send again"}</h3>
                  <p className="fine" style={{ textAlign: "left", margin: 0 }}>{q.status === "draft" ? `Review it with View quote, then send. Emails ${lead.email} a link to this quote on labb.com, and you get an email each time they open it.` : `Emails ${lead.email} the link again with the current quote.`}</p>
                  <a href={`/quote/${q.token}?preview=1`} target="_blank" rel="noreferrer" className="btn btn-outline-dark">View quote</a>
                  {act("send", <button className="btn btn-primary" type="submit">{q.status === "draft" ? "Approve and send" : "Send the link again"}</button>)}
                  {q.status !== "draft" && q.status !== "declined" && act("decline", <button className="linkish" type="submit">Mark as declined</button>)}
                </div>
              )}
              {!locked && (
                <div className="hero-card">
                  <h3>Pricing tier</h3>
                  {act("level", <>
                    <label className="sr-only" htmlFor="q-level">Pricing tier</label>
                    <select id="q-level" name="level" defaultValue={q.price_level}>{PRICE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select>
                    <button className="btn btn-outline-dark btn-sm" type="submit">Apply tier prices</button>
                    <p className="fine" style={{ textAlign: "left", margin: 0 }}>Sets every price-list line to this tier. To go off-tier, change the line&apos;s price in Line items. <Link href="/admin/sales-quotes/prices">Quote prices</Link></p>
                  </>)}
                </div>
              )}
              {!locked && (
                <div className="hero-card">
                  <h3>Layout</h3>
                  {act("template", <>
                    <label className="sr-only" htmlFor="q-tpl">Template</label>
                    <select id="q-tpl" name="template" defaultValue={q.template_id || ""}>{templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                    <button className="btn btn-outline-dark btn-sm" type="submit">Use this template</button>
                  </>)}
                  <details className="lp-more" style={{ marginTop: 10 }}>
                    <summary>Edit this quote&apos;s HTML</summary>
                    {act("html", <>
                      <textarea name="html" rows={14} defaultValue={q.html} spellCheck={false} className="code-area" aria-label="Quote HTML" />
                      <button className="btn btn-outline-dark btn-sm" type="submit">Save HTML</button>
                    </>)}
                  </details>
                  <p className="fine" style={{ textAlign: "left", margin: "8px 0 0" }}><Link href="/admin/sales-quotes/templates">Manage templates</Link></p>
                </div>
              )}
          </div>

          <div className="qb-body">
            <div className="qb-main">
              {act("save", <>
                <input type="hidden" name="back" value={`/admin/sales-quotes/${q.id}`} />
                <div className="hero-card">
                  <h2>Line items</h2>
                  <p className="fine" style={{ textAlign: "left", marginTop: -6 }}>Every product on the quote price list is a line here. Check Remove from quote to hide a line from the client; uncheck it to show it again. Rapid tests are priced per test and sold in boxes of 25: enter the quantity in boxes. Every line on the quote is shown to the client with its price, even at a quantity of 0, so they see their pricing for everything you selected. Use Remove from quote to hide a line. The client can change quantities of every priced one-time item (never below the minimum), but not software, included items or lab and MRO services, which are billed later, as used.</p>
                  <div style={{ overflowX: "auto" }}>
                    <table className="meet-table qb-items">
                      <thead><tr><th>Item</th><th>Billing</th><th>Price</th><th>Qty</th><th>Min</th><th title="The lead can change the quantity">Lead edits</th><th>Total</th><th title="Takes the line off the quote but keeps it and its price here">Remove from quote</th></tr></thead>
                      <tbody>
                        {!rows.length && <tr><td colSpan={8}>No items yet. Add products in Quote prices.</td></tr>}
                        {rows.map((r, n) => {
                          const head = (n === 0 || rows[n - 1].cat !== r.cat) && <span className="qb-cat">{catLabel(r.cat)}</span>;
                          const i = r.i;
                          return (
                          <tr key={i.id} className={i.excluded ? "qb-excl" : ""}>
                            <td>
                              {head}
                              <input name={`name_${i.id}`} defaultValue={i.name} maxLength={200} aria-label="Item name" disabled={locked} />
                              <input name={`desc_${i.id}`} defaultValue={i.description || ""} maxLength={500} placeholder="Description (optional)" aria-label="Description" className="qb-desc" disabled={locked} />
                            </td>
                            <td><select name={`billing_${i.id}`} defaultValue={i.billing} aria-label="Billing" disabled={locked}>{Object.entries(BILLING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                            <td><input name={`price_${i.id}`} defaultValue={(i.unit_cents / 100).toFixed(2)} inputMode="decimal" aria-label="Unit price" className="qb-num" disabled={locked} />{i.unit && <span className="fine"> /{i.unit}</span>}</td>
                            <td>{i.billing === "invoiced" ? <><input type="hidden" name={`qty_${i.id}`} value="0" /><span className="fine">n/a</span></> : <input name={`qty_${i.id}`} type="number" min={0} defaultValue={i.qty} aria-label="Quantity" className="qb-qty" disabled={locked} />}{packOf(i) > 1 && <span className="fine" style={{ display: "block" }}>boxes</span>}</td>
                            <td>{i.billing === "invoiced" ? <><input type="hidden" name={`min_${i.id}`} value="0" /><span className="fine">n/a</span></> : <input name={`min_${i.id}`} type="number" min={0} defaultValue={i.min_qty} aria-label="Minimum quantity" className="qb-qty" disabled={locked} />}</td>
                            <td style={{ textAlign: "center" }}><span className="fine">{leadCanEdit(i) ? "Yes" : "No"}</span></td>
                            <td className="qb-line">{i.excluded ? <span className="fine">Not on quote</span> : i.billing === "invoiced" ? <span className="fine">As used</span> : <>{money(lineCents(i))}{i.billing === "monthly" ? "/mo" : ""}{packOf(i) > 1 && <span className="fine" style={{ display: "block" }}>{i.qty} × box of {KIT_BOX}</span>}</>}</td>
                            <td style={{ textAlign: "center" }}><input type="checkbox" name={`del_${i.id}`} value="1" defaultChecked={!!i.excluded} aria-label={`Remove ${i.name} from the quote`} disabled={locked} />{i.excluded && <span className="qb-exctag">Removed</span>}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="qb-totals">
                    <span>One time: <strong>{money(t.once)}</strong></span>
                    <span>Monthly software: <strong>{money(t.monthly)}</strong></span>
                    <span>Due at acceptance: <strong>{money(t.dueToday)}</strong></span>
                  </div>
                </div>
                <div className="hero-card">
                  <h2>Quote details</h2>
                  <div className="qb-fields">
                    <div className="field qb-wide"><label htmlFor="q-title">Title</label><input id="q-title" name="title" defaultValue={q.title} maxLength={200} disabled={locked} /></div>
                    <div className="field"><label htmlFor="q-exp">Valid until</label><input id="q-exp" name="expires" type="date" defaultValue={expires} disabled={locked} /></div>
                    <div className="field"><label htmlFor="q-rep">Rep (gets the open alerts)</label>
                      <select id="q-rep" name="rep" defaultValue={q.rep_id || ""} disabled={locked}>{admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                    <div className="field qb-wide"><label htmlFor="q-notes">Internal notes (not shown to the lead)</label><textarea id="q-notes" name="notes" rows={2} defaultValue={q.notes || ""} disabled={locked} /></div>
                  </div>
                </div>
                {!locked && <div className="qb-savebar"><button className="btn btn-primary" type="submit">Save changes</button><span className="fine">Checked lines in Remove from quote come off the quote when you save. They stay here with their prices; uncheck to bring one back.</span></div>}
              </>)}

              {!locked && (
                <div className="hero-card qb-addp">
                  <h2>Add a custom item</h2>
                  <p className="fine" style={{ textAlign: "left", marginTop: -6 }}>Every product on <a href="/admin/sales-quotes/prices">Quote prices</a> is already a line above. Add a custom line here for anything that isn&apos;t on the price list.</p>
                  <div className="qb-custom">
                    {act("add-item", <div className="qb-add">
                      <input name="custom_name" placeholder="Custom item name" maxLength={200} aria-label="Custom item name" />
                      <input name="custom_price" placeholder="Price" inputMode="decimal" aria-label="Custom item price" className="qb-num" />
                      <input name="custom_unit" placeholder="Unit (kit, month)" maxLength={40} aria-label="Unit" className="qb-num" />
                      <select name="custom_billing" aria-label="Billing" defaultValue="once">{Object.entries(BILLING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                      <button className="btn btn-outline-dark btn-sm" type="submit">Add</button>
                    </div>)}
                  </div>
                  {act("remove-empty", <button className="linkish" type="submit" style={{ marginTop: 10 }}>Remove every item with a quantity of 0</button>)}
                </div>
              )}


              {!locked && (
                <div className="hero-card qb-ai">
                  <h2>Change it with AI</h2>
                  <p className="fine" style={{ textAlign: "left", marginTop: -6 }}>Describe the change. AI can rewrite wording, reorder sections, and change prices, quantities and items. Every change is saved as a version you can undo.</p>
                  {aiReady() ? act("ai", <>
                    <label className="sr-only" htmlFor="q-ai">What should change?</label>
                    <textarea id="q-ai" name="prompt" rows={3} required maxLength={4000} placeholder="Examples: Make the intro warmer and mention their 3 locations. Set every rapid kit to $4.25. Add 2 readers. Add a note that pricing is locked for 12 months." />
                    <button className="btn btn-primary" type="submit">Apply with AI</button>
                    <p className="fine" style={{ textAlign: "left", margin: 0 }}>Takes up to a minute. Review the preview before sending.</p>
                  </>) : <p className="form-error" style={{ margin: 0 }}>AI editing turns on once ANTHROPIC_API_KEY is set in Render.</p>}
                </div>
              )}

            </div>

            <div className="qb-extra">
              <div className="hero-card">
                <h3>Versions <span className="fine">· the last 5 are kept</span></h3>
                {!versions.length ? <p className="fine" style={{ textAlign: "left", margin: 0 }}>Saved changes show here.</p> : (
                  <ul className="qb-versions">
                    {versions.map((v) => (
                      <li key={v.id}>
                        <span><strong>{v.summary || "Saved"}</strong>{v.prompt && <em>&ldquo;{v.prompt.slice(0, 120)}&rdquo;</em>}<span className="fine">{fmtDate(v.created_at)}{v.by ? ` · ${v.by}` : ""}</span></span>
                        {!locked && act("restore", <><input type="hidden" name="version" value={v.id} /><button className="linkish" type="submit">Restore</button></>)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="hero-card">
                <h3>More</h3>
                {act("duplicate", <button className="linkish" type="submit">Duplicate into a new draft</button>)}
                {q.status === "draft" && act("delete", <button className="linkish" type="submit">Delete this draft</button>)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
