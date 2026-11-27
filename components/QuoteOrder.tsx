"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; name: string; description: string | null; sku: string | null; unit: string | null; unit_cents: number; qty: number; min_qty: number; adjustable: boolean; billing: "once" | "monthly" | "invoiced"; category?: string | null };
const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const per = (u: string | null) => (u ? u.replace(/^per\s+/i, "") : "");
const unitLabel = (u: string | null) => { const x = per(u); return !x ? "" : /^each$/i.test(x) ? "each" : `per ${x}`; };

type GroupKey = "software" | "included" | "equipment" | "kits" | "lab";
const GROUPS: { key: GroupKey; title: string; note: string }[] = [
  { key: "software", title: "Software", note: "Billed monthly. The first month is due at acceptance." },
  { key: "included", title: "Included with your account", note: "No charge." },
  { key: "equipment", title: "Labb Station equipment", note: "One-time purchase." },
  { key: "kits", title: "Rapid test kits", note: "One-time purchase. Set the number of tests you want in your first order." },
  { key: "lab", title: "Lab and MRO services", note: "Nothing is charged today. These are invoiced later, only for tests you order." },
];
function groupOf(i: Item): GroupKey {
  if (i.billing === "invoiced") return "lab";
  if (i.billing === "monthly") return "software";
  if (!i.unit_cents) return "included";
  if (i.category === "rapid-kits") return "kits";
  return "equipment";
}

// The lead's order: change quantities of the items Labb made adjustable, see totals update, save.
export function QuoteOrder({ token, items, editable, preview = false }: { token: string; items: Item[]; editable: boolean; preview?: boolean }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(items.map((i) => [i.id, i.qty])));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Every line the rep put on the quote is shown, ordered or not, so the client sees their pricing.
  const visible = items;
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

  const qtyCell = (i: Item) => {
    const n = qty[i.id] ?? 0;
    if (editable && i.adjustable) return (
      <span className="qo-step">
        <button type="button" onClick={() => set(i, n - 1)} aria-label={`Fewer ${i.name}`} disabled={n <= i.min_qty}>−</button>
        <input type="number" min={i.min_qty} max={100000} value={n} onChange={(e) => set(i, Number(e.target.value))} aria-label={`Quantity of ${i.name}`} />
        <button type="button" onClick={() => set(i, n + 1)} aria-label={`More ${i.name}`}>+</button>
      </span>
    );
    return <span className="qo-fixed">{n}</span>;
  };

  return (
    <div className="qo">
      {GROUPS.map((g) => {
        const rows = visible.filter((i) => groupOf(i) === g.key);
        if (!rows.length) return null;
        return (
          <section key={g.key} className={`qo-group qo-${g.key}`}>
            <header className="qo-ghead"><h3>{g.title}</h3><p>{g.note}</p></header>
            {(g.key === "software" || g.key === "equipment" || g.key === "kits") && (
              <div className="qo-row qo-cols" aria-hidden="true"><span>Item</span><span>Price</span><span>Quantity</span><span>Total</span></div>
            )}
            {rows.map((i) => {
              const n = qty[i.id] ?? 0;
              if (g.key === "included" || g.key === "lab") return (
                <div key={i.id} className="qo-row qo-simple">
                  <div className="qo-name"><strong>{i.name}</strong>{i.description && <span>{i.description}</span>}</div>
                  <div className="qo-flat">{g.key === "included" ? "Included" : i.unit_cents ? <>{money(i.unit_cents)}<small> {unitLabel(i.unit) || "per test"}</small></> : "Contact Labb sales"}</div>
                </div>
              );
              return (
                <div key={i.id} className={`qo-row${n === 0 ? " qo-off" : ""}`}>
                  <div className="qo-name"><strong>{i.name}{n === 0 && <em className="qo-opt">{i.adjustable ? "Optional" : "Not included"}</em>}</strong>{i.description && <span>{i.description}</span>}{n === 0 && !i.adjustable && <span>Ask your Labb rep to add it.</span>}</div>
                  <div className="qo-price"><b>{money(i.unit_cents)}{i.billing === "monthly" ? "/mo" : ""}</b>{i.unit && <small>{unitLabel(i.unit)}</small>}</div>
                  <div className="qo-qty">{qtyCell(i)}{editable && i.adjustable && i.min_qty > 0 && <small>Minimum {i.min_qty}</small>}</div>
                  <div className="qo-total">{n === 0 ? <span className="qo-dash">—</span> : <>{money(n * i.unit_cents)}{i.billing === "monthly" ? "/mo" : ""}</>}</div>
                </div>
              );
            })}
          </section>
        );
      })}

      <div className="qo-summary">
        <div className="qo-lines">
          <div><span>One-time items</span><strong>{money(t.once)}</strong></div>
          {t.monthly > 0 && <div><span>Software, first month</span><strong>{money(t.monthly)}</strong></div>}
          {t.monthly > 0 && <p>Software then bills {money(t.monthly)} a month. Taxes and shipping, if any, are added at checkout.</p>}
        </div>
        <div className="qo-due"><span>Due at acceptance</span><strong>{money(t.due)}</strong></div>
      </div>

      {editable && (dirty || state !== "idle") && (
        <div className="qo-save">
          <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || state === "saving"}>{state === "saving" ? "Saving…" : "Update my quote"}</button>
          <span>{preview && state === "saved" ? "Preview: in the live quote this saves the new quantities." : state === "saved" && !dirty ? "Saved. Your rep can see the new quantities." : state === "error" ? "That didn't save. Try again." : dirty ? `New total due: ${money(t.due)}. Update the quote before you sign.` : ""}</span>
        </div>
      )}
    </div>
  );
}
