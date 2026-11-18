"use client";

import { useState } from "react";

export type QuoteProduct = { id: string; name: string; sku: string | null; unit: string | null; category: string; msrpCents: number | null };
type Row = { pid: string; name: string; qty: string; price: string };

const blank = (): Row => ({ pid: "", name: "", qty: "1", price: "" });
const cents = (v: string) => Math.round(parseFloat(v.replace(/[$,\s]/g, "")) * 100);
const fmt = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

// A CPP member records a quote for a lead. Products come from the CPP price list; "Other" allows anything else.
export function QuoteForm({ leadId, products, groups }: { leadId: string; products: QuoteProduct[]; groups: { value: string; label: string }[] }) {
  const [rows, setRows] = useState<Row[]>([blank()]);
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const total = rows.reduce((t, r) => {
    const q = parseInt(r.qty, 10), p = cents(r.price);
    return t + (q > 0 && p >= 0 ? q * p : 0);
  }, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action="/api/members/quotes" method="post" className="quote-form">
      <input type="hidden" name="action" value="create" />
      <input type="hidden" name="lead" value={leadId} />
      <div className="qf-rows">
        <div className="qf-row qf-headrow" aria-hidden="true"><span>Product or service</span><span>Qty</span><span>Unit price</span><span>Line total</span><span /></div>
        {rows.map((r, i) => {
          const q = parseInt(r.qty, 10), p = cents(r.price);
          return (
            <div className="qf-row" key={i}>
              <div className="qf-product">
                <select name="item_pid" aria-label={`Product ${i + 1}`} value={r.pid} required onChange={(e) => {
                  const pr = products.find((x) => x.id === e.target.value);
                  set(i, { pid: e.target.value });
                }}>
                  <option value="">Choose a product</option>
                  {groups.map((g) => {
                    const list = products.filter((x) => x.category === g.value);
                    return list.length ? <optgroup key={g.value} label={g.label}>{list.map((x) => <option key={x.id} value={x.id}>{x.name}{x.unit ? ` (${x.unit})` : ""}</option>)}</optgroup> : null;
                  })}
                  <option value="other">Other product or service</option>
                </select>
                {r.pid === "other" ? (
                  <input name="item_name" aria-label={`Describe product ${i + 1}`} placeholder="Describe it" value={r.name} required maxLength={160} onChange={(e) => set(i, { name: e.target.value })} />
                ) : <input type="hidden" name="item_name" value="" />}
              </div>
              <input name="item_qty" aria-label={`Quantity ${i + 1}`} inputMode="numeric" value={r.qty} required pattern="[0-9]{1,7}" onChange={(e) => set(i, { qty: e.target.value })} />
              <input name="item_price" aria-label={`Unit price ${i + 1}`} inputMode="decimal" pattern="\$?[0-9,]*(\.[0-9]{1,2})?" title="A price like 12.50" value={r.price} required
                placeholder={(() => { const pr = products.find((x) => x.id === r.pid); return pr?.msrpCents != null ? `MSRP ${(pr.msrpCents / 100).toFixed(2)}` : "$0.00"; })()}
                onChange={(e) => set(i, { price: e.target.value })} />
              <span className="qf-line">{q > 0 && p >= 0 ? fmt(q * p) : ""}</span>
              <button type="button" className="icon-act" aria-label="Remove line" data-tip="Remove line" disabled={rows.length === 1} onClick={() => setRows((r2) => r2.filter((_, j) => j !== i))}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          );
        })}
      </div>
      <div className="qf-foot">
        <button type="button" className="btn btn-outline-dark" onClick={() => setRows((r) => [...r, blank()])}>+ Add a line</button>
        <span className="qf-total">Quote total <strong>{fmt(total)}</strong></span>
      </div>
      <div className="fields" style={{ marginTop: 14 }}>
        <div className="field">
          <label htmlFor={`qd-${leadId}`}>Quote date</label>
          <input id={`qd-${leadId}`} name="quoted_on" type="date" defaultValue={today} required />
        </div>
        <div className="field">
          <label htmlFor={`qs-${leadId}`}>Status</label>
          <select id={`qs-${leadId}`} name="status" defaultValue="sent">
            <option value="draft">Draft</option>
            <option value="sent">Sent to client</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
          </select>
        </div>
        <div className="field full">
          <label htmlFor={`qn-${leadId}`}>Notes (only you and Labb see these)</label>
          <input id={`qn-${leadId}`} name="notes" maxLength={1000} placeholder="Terms, contract length, what the client asked for" />
        </div>
      </div>
      <button className="btn btn-primary" type="submit" style={{ marginTop: 14 }}>Save quote</button>
    </form>
  );
}
