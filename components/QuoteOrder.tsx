"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; name: string; description: string | null; sku: string | null; unit: string | null; unit_cents: number; qty: number; min_qty: number; adjustable: boolean; billing: "once" | "monthly" | "invoiced" };
const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

// The lead's order: change quantities of the items Labb made adjustable, see totals update, save.
export function QuoteOrder({ token, items, editable, preview = false }: { token: string; items: Item[]; editable: boolean; preview?: boolean }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(items.map((i) => [i.id, i.qty])));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const order = items.filter((i) => i.billing !== "invoiced" && (i.qty > 0 || i.adjustable));
  const lab = items.filter((i) => i.billing === "invoiced");
  const dirty = items.some((i) => qty[i.id] !== i.qty);
  const t = useMemo(() => {
    let once = 0, monthly = 0;
    for (const i of items) { const n = qty[i.id] ?? 0; if (i.billing === "once") once += n * i.unit_cents; else if (i.billing === "monthly") monthly += n * i.unit_cents; }
    return { once, monthly, due: once + monthly };
  }, [qty, items]);
  const set = (i: Item, v: number) => setQty((p) => ({ ...p, [i.id]: Math.max(i.min_qty, Math.min(100000, Math.floor(Number.isFinite(v) ? v : 0))) }));
  const save = async () => {
    if (preview) { setState("saved"); return; }
    setState("saving");
    try {
      const r = await fetch("/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, qty }) });
      if (!r.ok) throw new Error();
      setState("saved");
      router.refresh();
    } catch { setState("error"); }
  };
  return (
    <div className="qo">
      <table className="qo-table">
        <thead><tr><th>Item</th><th className="num">Price</th><th className="num">Quantity</th><th className="num">Total</th></tr></thead>
        <tbody>
          {order.map((i) => (
            <tr key={i.id} className={(qty[i.id] ?? 0) === 0 ? "qo-zero" : ""}>
              <td><strong>{i.name}</strong>{i.description && <span className="qo-desc">{i.description}</span>}{(qty[i.id] ?? 0) === 0 && <span className="qo-desc">Not included. Add it by setting a quantity.</span>}</td>
              <td className="num">{i.unit_cents ? <>{money(i.unit_cents)}{i.billing === "monthly" ? "/mo" : ""}{i.unit && <span className="qo-unit"> per {i.unit.replace(/^per\s+/i, "")}</span>}</> : "Included"}</td>
              <td className="num">
                {editable && i.adjustable ? (
                  <span className="qo-step">
                    <button type="button" onClick={() => set(i, (qty[i.id] ?? 0) - 1)} aria-label={`Fewer ${i.name}`} disabled={(qty[i.id] ?? 0) <= i.min_qty}>−</button>
                    <input type="number" min={i.min_qty} max={100000} value={qty[i.id] ?? 0} onChange={(e) => set(i, Number(e.target.value))} aria-label={`Quantity of ${i.name}`} />
                    <button type="button" onClick={() => set(i, (qty[i.id] ?? 0) + 1)} aria-label={`More ${i.name}`}>+</button>
                  </span>
                ) : <span>{qty[i.id]}</span>}
                {editable && i.adjustable && i.min_qty > 0 && <span className="qo-unit">Minimum {i.min_qty}</span>}
              </td>
              <td className="num">{i.unit_cents ? <>{money((qty[i.id] ?? 0) * i.unit_cents)}{i.billing === "monthly" ? "/mo" : ""}</> : "Included"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="qo-totals">
        <div><span>One-time items</span><strong>{money(t.once)}</strong></div>
        {t.monthly > 0 && <div><span>Software, first month</span><strong>{money(t.monthly)}</strong></div>}
        <div className="qo-due"><span>Due at acceptance</span><strong>{money(t.due)}</strong></div>
        {t.monthly > 0 && <p>Software then bills {money(t.monthly)} a month. Taxes and shipping, if any, are added at checkout.</p>}
      </div>
      {editable && (dirty || state !== "idle") && (
        <div className="qo-save">
          <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || state === "saving"}>{state === "saving" ? "Saving…" : "Update my quote"}</button>
          <span>{preview && state === "saved" ? "Preview: in the live quote this saves the new quantities." : state === "saved" && !dirty ? "Saved. Your rep can see the new quantities." : state === "error" ? "That didn't save. Try again." : dirty ? "Update the quote before you sign." : ""}</span>
        </div>
      )}
      {lab.length > 0 && (
        <div className="qo-lab">
          <h3>Lab and MRO services, billed as used</h3>
          <ul>{lab.map((i) => <li key={i.id}><span>{i.name}{i.description && <span className="qo-desc">{i.description}</span>}</span><strong>{i.unit_cents ? `${money(i.unit_cents)}${i.unit ? ` per ${i.unit.replace(/^per\s+/i, "")}` : ""}` : "Contact Labb sales"}</strong></li>)}</ul>
          <p>Nothing is charged for these today. They are invoiced later, only for tests you order.</p>
        </div>
      )}
    </div>
  );
}
