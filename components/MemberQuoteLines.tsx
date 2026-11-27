"use client";
import { useMemo, useState } from "react";

// A CPP member's quote lines: their cost beside the client price, with margin worked out as they type.
// Cost and margin are for the member only; the quote the client sees shows client prices.
export type MemberLine = {
  id: string; name: string; description: string | null; category: string | null; unit: string | null;
  billing: "once" | "monthly" | "invoiced"; price: number; qty: number; excluded: boolean;
  linkedCost: number | null; ownCost: number | null;
};
const BOX = 25;
const CAT: Record<string, string> = { saas: "Software", services: "Setup and services", readers: "Readers and systems", stands: "Stands and accessories", "rapid-kits": "Rapid test kits (sold in boxes of 25)", "lab-mro": "Lab tests and MRO (billed as used)" };
const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const dollars = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));
const cents = (s: string) => { const n = Number(s.replace(/[^0-9.]/g, "")); return s.trim() === "" || !Number.isFinite(n) ? null : Math.round(n * 100); };

export function MemberQuoteLines({ lines, locked }: { lines: MemberLine[]; locked: boolean }) {
  const [st, setSt] = useState(() => Object.fromEntries(lines.map((l) => [l.id, { price: dollars(l.price), qty: String(l.qty), cost: dollars(l.ownCost), del: l.excluded }])));
  const set = (id: string, k: "price" | "qty" | "cost" | "del", v: string | boolean) => setSt((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));
  const calc = useMemo(() => lines.map((l) => {
    const s = st[l.id];
    const price = cents(s.price) ?? 0;
    const cost = l.linkedCost ?? cents(s.cost);
    const pack = l.category === "rapid-kits" ? BOX : 1;
    const qty = l.billing === "invoiced" ? 0 : Math.max(0, parseInt(s.qty, 10) || 0);
    const unitMargin = cost == null ? null : price - cost;
    const pct = cost == null || price <= 0 ? null : ((price - cost) / price) * 100;
    return { l, price, cost, pack, qty, unitMargin, pct, revenue: price * qty * pack, costTotal: cost == null ? null : cost * qty * pack, off: !!s.del };
  }), [lines, st]);
  const live = calc.filter((c) => !c.off && c.l.billing !== "invoiced");
  const revenue = live.reduce((t, c) => t + c.revenue, 0);
  const known = live.filter((c) => c.costTotal != null);
  const cost = known.reduce((t, c) => t + (c.costTotal ?? 0), 0);
  const knownRev = known.reduce((t, c) => t + c.revenue, 0);
  const missingCost = live.some((c) => c.qty > 0 && c.costTotal == null);

  let last = "";
  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table className="meet-table qb-items mq-items">
          <thead><tr><th>Item</th><th>Your cost</th><th>Client price</th><th>Qty</th><th>Client total</th><th>Margin</th><th>Gross margin</th><th title="Hides the line from the client; it stays here with its price">Remove from quote</th></tr></thead>
          <tbody>
            {calc.map((c) => {
              const { l } = c; const s = st[l.id];
              const cat = CAT[l.category || ""] || "Other";
              const head = cat !== last ? ((last = cat), <span className="qb-cat">{cat}</span>) : null;
              const per = l.category === "rapid-kits" ? "/test" : l.billing === "monthly" ? "/mo" : l.unit ? `/${l.unit.replace(/^per\s+/i, "")}` : "";
              return (
                <tr key={l.id} className={c.off ? "qb-excl" : ""}>
                  <td>{head}<strong className="mq-name">{l.name}</strong>{l.description && <span className="fine mq-desc">{l.description}</span>}</td>
                  <td className="mq-cost">{l.linkedCost != null ? <><b>{money(l.linkedCost)}</b><span className="fine">{per}</span></>
                    : <><input name={`cost_${l.id}`} value={s.cost} onChange={(e) => set(l.id, "cost", e.target.value)} inputMode="decimal" placeholder="Your cost" className="qb-num" aria-label={`Your cost for ${l.name}`} disabled={locked} /><span className="fine">{per}</span></>}</td>
                  <td><input name={`price_${l.id}`} value={s.price} onChange={(e) => set(l.id, "price", e.target.value)} inputMode="decimal" className="qb-num" aria-label={`Client price for ${l.name}`} disabled={locked} /><span className="fine">{per}</span></td>
                  <td>{l.billing === "invoiced" ? <><input type="hidden" name={`qty_${l.id}`} value="0" /><span className="fine">As used</span></>
                    : <><input name={`qty_${l.id}`} type="number" min={0} value={s.qty} onChange={(e) => set(l.id, "qty", e.target.value)} className="qb-qty" aria-label={`Quantity of ${l.name}`} disabled={locked} />{c.pack > 1 && <span className="fine" style={{ display: "block" }}>boxes</span>}</>}</td>
                  <td className="qb-line">{l.billing === "invoiced" ? <span className="fine">As used</span> : <>{money(c.revenue)}{l.billing === "monthly" ? "/mo" : ""}</>}</td>
                  <td className={`mq-m${c.pct != null && c.pct < 0 ? " neg" : ""}`}>{c.pct == null ? <span className="fine">Enter cost</span> : `${c.pct.toFixed(1)}%`}</td>
                  <td className={`mq-m${c.unitMargin != null && c.unitMargin < 0 ? " neg" : ""}`}>{c.unitMargin == null ? "" : l.billing === "invoiced" ? <>{money(c.unitMargin)}<span className="fine"> per test</span></> : c.qty > 0 ? <>{money(c.unitMargin * c.qty * c.pack)}{l.billing === "monthly" ? "/mo" : ""}</> : <>{money(c.unitMargin * c.pack)}<span className="fine"> {c.pack > 1 ? "per box" : "each"}</span></>}</td>
                  <td style={{ textAlign: "center" }}><input type="checkbox" name={`del_${l.id}`} value="1" checked={s.del} onChange={(e) => set(l.id, "del", e.target.checked)} aria-label={`Remove ${l.name} from the quote`} disabled={locked} />{s.del && <span className="qb-exctag">Removed</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mq-sum">
        <div><span>Client total due at acceptance</span><strong>{money(revenue)}</strong></div>
        <div><span>Your cost</span><strong>{money(cost)}</strong></div>
        <div><span>Your gross margin</span><strong className={knownRev - cost < 0 ? "neg" : ""}>{money(knownRev - cost)}</strong></div>
        <div><span>Margin</span><strong>{knownRev > 0 ? `${(((knownRev - cost) / knownRev) * 100).toFixed(1)}%` : "—"}</strong></div>
        <p className="fine">Only you see your cost and margin. The client sees client prices. Software counts its first month. Lab and MRO margins are per test, billed as used.{missingCost ? " Some lines have no cost yet, so they're left out of the margin." : ""}</p>
      </div>
    </>
  );
}
