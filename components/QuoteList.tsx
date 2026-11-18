import { QUOTE_STATUSES, type Quote } from "@/lib/quotes";

const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

// A member's saved quotes. Status can be changed and a quote deleted; edits are logged on the lead.
export function QuoteList({ quotes, back, leadNames }: { quotes: Quote[]; back?: "quotes"; leadNames?: Record<string, string> }) {
  if (!quotes.length) return null;
  return (
    <div className="quote-list">
      {quotes.map((q) => (
        <div key={q.id} className="quote-card">
          <div className="quote-top">
            <div>
              <strong>Quote #{q.id}</strong>
              {leadNames?.[q.lead_id] && <span className="quote-for"> for {leadNames[q.lead_id]}</span>}
              <span className="fine"> · {q.quoted_on}{q.state ? ` · ${q.state}` : ""}{q.industry ? ` · ${q.industry}` : ""}</span>
            </div>
            <span className="quote-total">{money(q.total_cents)}</span>
          </div>
          <table className="quote-items">
            <thead><tr><th scope="col">Product</th><th scope="col">Qty</th><th scope="col">Unit price</th><th scope="col">Line total</th></tr></thead>
            <tbody>
              {q.items.map((i, n) => (
                <tr key={n}>
                  <td>{i.product_name}{i.sku ? <span className="fine"> · {i.sku}</span> : null}{i.unit ? <span className="fine"> · {i.unit}</span> : null}</td>
                  <td>{i.quantity.toLocaleString()}</td>
                  <td>{money(i.unit_price_cents)}</td>
                  <td>{money(i.quantity * i.unit_price_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {q.notes && <p className="quote-notes">{q.notes}</p>}
          <div className="quote-actions">
            <form action="/api/members/quotes" method="post" className="quote-status">
              <input type="hidden" name="action" value="status" />
              <input type="hidden" name="id" value={q.id} />
              {back && <input type="hidden" name="back" value={back} />}
              <label htmlFor={`qst-${q.id}`} className="fine">Status</label>
              <select id={`qst-${q.id}`} name="status" defaultValue={q.status}>
                {QUOTE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button className="btn btn-outline-dark btn-sm" type="submit">Update</button>
            </form>
            <form action="/api/members/quotes" method="post">
              <input type="hidden" name="action" value="delete" />
              <input type="hidden" name="id" value={q.id} />
              {back && <input type="hidden" name="back" value={back} />}
              <button className="icon-act danger" type="submit" aria-label={`Delete quote ${q.id}`} data-tip="Delete quote">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
