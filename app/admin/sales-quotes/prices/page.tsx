import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { QUOTE_PRICE_CATEGORIES, type PriceRow } from "@/lib/salesQuotes";

export const metadata: Metadata = { title: "Quote prices", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const dollars = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));

// Labb's own quote price list: two tiers by monthly kit volume. Not the CPP price list.
export default async function QuotePrices() {
  await requireAdmin("/admin/sales-quotes/prices");
  const [rows, flash, cpp] = await Promise.all([
    sql()<(PriceRow & { updated_at: Date; cpp_item_id: string | null })[]>`select * from quote_price_items order by array_position(array['saas','services','readers','stands','rapid-kits','lab-mro'], category), sort, name`,
    readFlash(),
    sql()<{ id: string; name: string; sku: string | null; sl1_cents: number | null; sl3_cents: number | null }[]>`select id::text, name, sku, sl1_cents, sl3_cents from cpp_price_items where active order by category, sort, name`,
  ]);
  return (
    <>
      <AdminBar title="Quote prices" current="/admin/sales-quotes" />
      <section className="section qb" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <p style={{ marginTop: 0 }}><Link href="/admin/sales-quotes">← Quotes</Link></p>
          <Flash flash={flash} />
          <h1 style={{ fontSize: "1.8rem", margin: "0 0 6px" }}>Quote prices</h1>
          <p style={{ marginTop: 0 }}>The prices Labb quotes to clients, in two tiers: <strong>under 100 kits per month</strong> and <strong>100+ kits per month</strong>. Each quote uses one tier; reps change individual lines when a deal needs a different price. This list is separate from CPP pricing, which is CPP members&apos; cost. CPP cost from links each product to its CPP price item, so members see their cost beside the client price on their own quotes (never on the quote itself). Leave a price blank for &ldquo;Contact Labb sales&rdquo;; $0 shows as &ldquo;Included&rdquo;.</p>

          <form action="/api/admin/sales-quotes" method="post" className="hero-card">
            <input type="hidden" name="action" value="price-save" />
            <div style={{ overflowX: "auto" }}>
              <table className="meet-table qpl">
                <thead><tr><th>Item</th><th>Category</th><th>SKU</th><th>Unit</th><th>Under 100 kits/mo</th><th>100+ kits/mo</th><th title="The CPP price item that sets a CPP member's cost for this product on their quotes">CPP cost from</th><th>Active</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={r.active ? "" : "qb-zero"}>
                      <td>
                        <input type="hidden" name="ids" value={r.id} />
                        <input name={`name_${r.id}`} defaultValue={r.name} maxLength={200} aria-label="Name" />
                        <input name={`desc_${r.id}`} defaultValue={r.description || ""} maxLength={500} placeholder="Description shown on quotes" aria-label="Description" className="qb-desc" />
                      </td>
                      <td><select name={`cat_${r.id}`} defaultValue={r.category} aria-label="Category">{QUOTE_PRICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></td>
                      <td><input name={`sku_${r.id}`} defaultValue={r.sku || ""} maxLength={60} aria-label="SKU" className="qb-num" /></td>
                      <td><input name={`unit_${r.id}`} defaultValue={r.unit || ""} maxLength={40} placeholder="test" aria-label="Unit" className="qb-num" /></td>
                      <td><span className="qpl-money">$<input name={`u100_${r.id}`} defaultValue={dollars(r.under100_cents)} inputMode="decimal" aria-label="Under 100 kits per month price" className="qb-num" /></span></td>
                      <td><span className="qpl-money">$<input name={`o100_${r.id}`} defaultValue={dollars(r.over100_cents)} inputMode="decimal" aria-label="100+ kits per month price" className="qb-num" /></span></td>
                      <td><select name={`cpp_${r.id}`} defaultValue={r.cpp_item_id ? String(r.cpp_item_id) : ""} aria-label="CPP price item for member cost" style={{ maxWidth: 220 }}>
                        <option value="">Not linked (member enters cost)</option>
                        {cpp.map((c) => <option key={c.id} value={c.id}>{c.name}{c.sku ? ` (${c.sku})` : ""}{c.sl1_cents != null ? ` · SL1 ${dollars(c.sl1_cents)}` : ""}</option>)}
                      </select></td>
                      <td style={{ textAlign: "center" }}><input type="checkbox" name={`active_${r.id}`} value="1" defaultChecked={r.active} aria-label={`${r.name} active`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="qb-savebar"><button className="btn btn-primary" type="submit">Save prices</button><span className="fine">{rows.length ? `Last change ${fmtDate(rows.reduce((a, r) => (r.updated_at > a ? r.updated_at : a), rows[0].updated_at))}` : ""}</span></div>
          </form>

          <form action="/api/admin/sales-quotes" method="post" className="hero-card" style={{ marginTop: 16 }}>
            <input type="hidden" name="action" value="price-add" />
            <h2>Add an item</h2>
            <div className="qpl-add">
              <input name="name" required maxLength={200} placeholder="Name" aria-label="Name" />
              <select name="cat" defaultValue="rapid-kits" aria-label="Category">{QUOTE_PRICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
              <input name="sku" maxLength={60} placeholder="SKU" aria-label="SKU" />
              <input name="unit" maxLength={40} placeholder="Unit (test, each, location)" aria-label="Unit" />
              <input name="u100" inputMode="decimal" placeholder="Under 100 price" aria-label="Under 100 kits per month price" />
              <input name="o100" inputMode="decimal" placeholder="100+ price" aria-label="100+ kits per month price" />
              <input name="desc" maxLength={500} placeholder="Description (optional)" aria-label="Description" className="qpl-wide" />
              <button className="btn btn-primary btn-sm" type="submit">Add item</button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
