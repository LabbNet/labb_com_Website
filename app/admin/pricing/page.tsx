import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { money, PRICE_CATEGORIES, type PriceCategory, type PriceItem } from "@/lib/cppPricing";

export const metadata: Metadata = { title: "CPP Pricing", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const cents = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));

function ItemFields({ item, category }: { item?: PriceItem; category: PriceCategory }) {
  const k = item ? item.id : `new-${category}`;
  return (
    <div className="fields price-fields">
      <input type="hidden" name="category" value={item?.category ?? category} />
      <div className="field full"><label htmlFor={`n-${k}`}>Product or service<span className="req">*</span></label><input id={`n-${k}`} name="name" required maxLength={160} defaultValue={item?.name} /></div>
      <div className="field"><label htmlFor={`s-${k}`}>SKU or code</label><input id={`s-${k}`} name="sku" maxLength={60} defaultValue={item?.sku ?? ""} /></div>
      <div className="field"><label htmlFor={`u-${k}`}>Unit</label><input id={`u-${k}`} name="unit" maxLength={60} defaultValue={item?.unit ?? ""} placeholder="Per kit, case of 25, per month" /></div>
      <div className="field"><label htmlFor={`m-${k}`}>Member cost ($)</label><input id={`m-${k}`} name="member_price" inputMode="decimal" defaultValue={cents(item?.member_cents ?? null)} placeholder="0.00" /></div>
      <div className="field"><label htmlFor={`e-${k}`}>Employer price ($)</label><input id={`e-${k}`} name="employer_price" inputMode="decimal" defaultValue={cents(item?.employer_cents ?? null)} placeholder="0.00" /></div>
      <div className="field full"><label htmlFor={`d-${k}`}>Product details</label><textarea id={`d-${k}`} name="description" maxLength={600} defaultValue={item?.description ?? ""} /></div>
      <div className="field full"><label htmlFor={`o-${k}`}>Notes for members</label><input id={`o-${k}`} name="notes" maxLength={300} defaultValue={item?.notes ?? ""} placeholder="Minimum order, volume tiers, lead time" /></div>
      <div className="field"><label htmlFor={`r-${k}`}>Sort order</label><input id={`r-${k}`} name="sort" type="number" min={0} max={9999} defaultValue={item?.sort ?? 100} /></div>
      <div className="field">
        <label htmlFor={`a-${k}`}>Shown to members</label>
        <select id={`a-${k}`} name="active" defaultValue={item && !item.active ? "no" : "yes"}><option value="yes">Yes</option><option value="no">No, hidden</option></select>
      </div>
    </div>
  );
}

export default async function AdminPricing() {
  await requireAdmin("/admin/pricing");
  const [items, flash] = await Promise.all([
    sql()<PriceItem[]>`select * from cpp_price_items order by category, sort, lower(name)`,
    readFlash(),
  ]);

  return (
    <>
      <AdminBar title="CPP member pricing" current="/admin/pricing" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <p className="lede" style={{ maxWidth: 820 }}>
            Products and prices here appear on the CPP member Pricing page. Member cost is what the member pays Labb. Employer price is the price
            for employers buying through the CPP. Leave a price blank to show &ldquo;Contact Labb&rdquo;.
          </p>
          {PRICE_CATEGORIES.map((c) => {
            const list = items.filter((i) => i.category === c.value);
            return (
              <div key={c.value} id={c.value} className="hero-card" style={{ marginTop: 28 }}>
                <h2 className="form-title">{c.label}</h2>
                <ul className="contract-list">
                  {list.map((i) => (
                    <li key={i.id} style={{ display: "block" }}>
                      <details>
                        <summary className="price-summary">
                          <span><strong>{i.name}</strong>{i.sku ? ` · ${i.sku}` : ""}{!i.active && <span className="tag plain" style={{ marginLeft: 8 }}>Hidden</span>}</span>
                          <span className="muted">{i.unit ? `${i.unit} · ` : ""}Member {money(i.member_cents) || "n/a"} · Employer {money(i.employer_cents) || "n/a"}</span>
                        </summary>
                        <form action="/api/admin/pricing" method="post" style={{ marginTop: 14 }}>
                          <input type="hidden" name="action" value="update" />
                          <input type="hidden" name="id" value={i.id} />
                          <ItemFields item={i} category={c.value} />
                          <div className="btn-row" style={{ marginTop: 14 }}>
                            <button className="btn btn-primary" type="submit">Save</button>
                            <span className="sub">Updated {fmtDate(i.updated_at)}</span>
                          </div>
                        </form>
                        <form action="/api/admin/pricing" method="post" style={{ marginTop: 8 }}>
                          <input type="hidden" name="action" value="delete" />
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="category" value={c.value} />
                          <button className="linkish danger" type="submit">Delete this item</button>
                        </form>
                      </details>
                    </li>
                  ))}
                  {!list.length && <li className="muted">No items yet.</li>}
                </ul>
                <details style={{ marginTop: 16 }}>
                  <summary className="btn btn-outline-dark" style={{ display: "inline-flex" }}>Add to {c.label.toLowerCase()}</summary>
                  <form action="/api/admin/pricing" method="post" style={{ marginTop: 16 }}>
                    <input type="hidden" name="action" value="create" />
                    <ItemFields category={c.value} />
                    <button className="btn btn-primary" style={{ marginTop: 14 }} type="submit">Add item</button>
                  </form>
                </details>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
