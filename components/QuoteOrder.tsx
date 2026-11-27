"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; name: string; description: string | null; sku: string | null; unit: string | null; unit_cents: number; qty: number; min_qty: number; adjustable: boolean; billing: "once" | "monthly" | "invoiced"; category?: string | null; drugs?: string; section?: GroupKey };
const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const BOX = 25;
const packOf = (i: Item) => (i.category === "rapid-kits" ? BOX : 1);
const per = (u: string | null) => (u ? u.replace(/^per\s+/i, "") : "");
const unitLabel = (u: string | null) => { const x = per(u); return !x ? "" : /^each$/i.test(x) ? "each" : `per ${x}`; };

type GroupKey = "mrc" | "nrc" | "urine" | "oral" | "lab";
const GROUPS: { key: GroupKey; title: string; note: string }[] = [
  { key: "mrc", title: "Set-up and MRC: Monthly Recurring Fees", note: "Software bills monthly; the first month is due at acceptance. Set-up items are one time." },
  { key: "nrc", title: "Hardware and NRC", note: "One-time purchase." },
  { key: "urine", title: "Rapid Urine Tests (Bundled with Confirmation and MRO)", note: "Sold in boxes of 25 tests. Set the number of boxes for your first order." },
  { key: "oral", title: "Rapid Oral Fluid Tests (Bundled with Confirmation and MRO)", note: "Sold in boxes of 25 tests. Set the number of boxes for your first order." },
  { key: "lab", title: "Laboratory and MRO Services", note: "Nothing is charged today. These are invoiced later, only for tests you order." },
];
const BUNDLE = "All-inclusive rapid test pricing. One price per test: each rapid test price includes the rapid test, laboratory confirmation of non-negative results and MRO review, at a capped positive rate of 6%.";
function groupOf(i: Item): GroupKey {
  if (i.section) return i.section;
  if (i.billing === "invoiced") return "lab";
  if (i.category === "rapid-kits") return /^UA/i.test(i.sku || "") ? "urine" : "oral";
  if (i.billing === "monthly" || !i.unit_cents) return "mrc";
  return "nrc";
}

// The lead's order: change quantities of the items Labb made adjustable, see totals update, save.
export function QuoteOrder({ token, items, editable, preview = false, repLabel = "your Labb rep" }: { token: string; items: Item[]; editable: boolean; preview?: boolean; repLabel?: string }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(items.map((i) => [i.id, i.qty])));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Every line the rep put on the quote is shown, ordered or not, so the client sees their pricing.
  const visible = items;
  const dirty = items.some((i) => qty[i.id] !== i.qty);
  // The Labb Station tablet and stand, if it's on the quote: the client can pick it here or in its line, and both stay in step.
  const reader = items.find((i) => i.category === "readers" && i.billing === "once" && i.unit_cents > 0) ?? null;
  const t = useMemo(() => {
    let once = 0, monthly = 0;
    for (const i of items) { const n = qty[i.id] ?? 0; if (i.billing === "once") once += n * i.unit_cents * packOf(i); else if (i.billing === "monthly") monthly += n * i.unit_cents; }
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
            {g.key !== "lab" && (
              <div className="qo-row qo-cols" aria-hidden="true"><span>Item</span><span>Price</span><span>Quantity</span><span>Total</span></div>
            )}
            {rows.map((i) => {
              const n = qty[i.id] ?? 0;
              const drugs = i.drugs ? <span className="qo-drugs">{i.drugs}</span> : null;
              if (g.key === "lab" || (!i.unit_cents && i.billing !== "invoiced")) return (
                <div key={i.id} className="qo-row qo-simple">
                  <div className="qo-name"><strong>{i.name}</strong>{i.description && <span>{i.description}</span>}{drugs}</div>
                  <div className={`qo-flat${!i.unit_cents && i.billing !== "invoiced" ? " qo-incl" : ""}`}>{i.billing !== "invoiced" ? "Included" : i.unit_cents ? <>{money(i.unit_cents)}<small> {unitLabel(i.unit) || "per test"}</small></> : repLabel === "your Labb rep" ? "Contact Labb sales" : `Ask ${repLabel}`}</div>
                </div>
              );
              return (
                <div key={i.id} className={`qo-row${n === 0 ? " qo-off" : ""}`}>
                  <div className="qo-name"><strong>{i.name}{n === 0 && <em className="qo-opt">{i.adjustable ? "Optional" : "Not included"}</em>}</strong>{i.description && <span>{i.description}</span>}{drugs}{n === 0 && !i.adjustable && <span>Ask {repLabel} to add it.</span>}</div>
                  <div className="qo-price">{packOf(i) > 1 ? <><b>{money(i.unit_cents * BOX)}</b><small>per box of {BOX}</small><small>{money(i.unit_cents)} per test</small></> : <><b>{money(i.unit_cents)}{i.billing === "monthly" ? "/mo" : ""}</b>{i.unit && <small>{unitLabel(i.unit)}</small>}</>}</div>
                  <div className="qo-qty">{qtyCell(i)}{packOf(i) > 1 && <small>{n === 1 ? "box" : "boxes"}{n > 0 ? ` (${(n * BOX).toLocaleString()} tests)` : ""}</small>}{editable && i.adjustable && i.min_qty > 0 && <small>Minimum {i.min_qty}</small>}</div>
                  <div className="qo-total">{n === 0 ? <span className="qo-dash">—</span> : <>{money(n * i.unit_cents * packOf(i))}{i.billing === "monthly" ? "/mo" : ""}</>}</div>
                </div>
              );
            })}
            {(g.key === "urine" || g.key === "oral") && <p className="qo-bundle"><strong>All-inclusive rapid test pricing.</strong> {BUNDLE.replace("All-inclusive rapid test pricing. ", "")}</p>}
          </section>
        );
      })}

      {reader && (
        <section className="qo-group qo-readerpick">
          <header className="qo-ghead"><h3>How will you read your tests?</h3><p>Choose one. This matches the {reader.name} line above.</p></header>
          <div className="qo-picks">
            <label className={`qo-pick${(qty[reader.id] ?? 0) === 0 ? " on" : ""}`}>
              <input type="radio" name={`reader_${reader.id}`} checked={(qty[reader.id] ?? 0) === 0} onChange={() => set(reader, 0)} disabled={!editable || !reader.adjustable} />
              <span><strong>Use our own phones and tablets</strong><small>Install the Labb app on the devices you already have. No hardware cost.</small></span>
            </label>
            <label className={`qo-pick${(qty[reader.id] ?? 0) > 0 ? " on" : ""}`}>
              <input type="radio" name={`reader_${reader.id}`} checked={(qty[reader.id] ?? 0) > 0} onChange={() => set(reader, Math.max(1, qty[reader.id] ?? 0))} disabled={!editable || !reader.adjustable} />
              <span><strong>Order the {reader.name}{reader.description ? ` (${reader.description.toLowerCase()})` : ""}</strong><small>{money(reader.unit_cents)} each, one time.{(qty[reader.id] ?? 0) > 0 ? ` ${qty[reader.id]} on this order; change the number in the line above.` : ""}</small></span>
            </label>
          </div>
        </section>
      )}

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
