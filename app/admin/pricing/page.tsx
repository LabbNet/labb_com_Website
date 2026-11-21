import type { Metadata } from "next";
import Link from "next/link";
import { backgroundPrices, BG_CATEGORIES, CPP_MARKUP_PCT, cppBackgroundCents } from "@/lib/backgroundPricing";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { money, PRICE_CATEGORIES, PRICE_FIELDS, PRODUCT_PAGES, type PriceCategory, type PriceItem } from "@/lib/cppPricing";

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
      {PRICE_FIELDS.map((f) => (
        <div key={f.form} className="field"><label htmlFor={`${f.form}-${k}`}>{f.label} ($)</label><input id={`${f.form}-${k}`} name={f.form} inputMode="decimal" defaultValue={cents(item?.[f.key] ?? null)} placeholder="0.00" /></div>
      ))}
      <div className="field full">
        <label htmlFor={`p-${k}`}>Product details page</label>
        <select id={`p-${k}`} name="product_path" defaultValue={item?.product_path ?? ""}>
          <option value="">{"Automatic: kit page matching the SKU, if any"}</option>
          {PRODUCT_PAGES.map((g) => <optgroup key={g.group} label={g.group}>{g.options.map((o) => <option key={o.path} value={o.path}>{o.label}</option>)}</optgroup>)}
        </select>
      </div>
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

export default async function AdminPricing({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin("/admin/pricing");
  const tab = (await searchParams).tab === "background" ? "background" : "drug";
  const tabs = (
    <nav className="price-tabs" aria-label="Pricing type">
      <Link href="/admin/pricing" aria-current={tab === "drug" ? "page" : undefined}>Drug testing</Link>
      <Link href="/admin/pricing?tab=background" aria-current={tab === "background" ? "page" : undefined}>Background checks</Link>
    </nav>
  );
  if (tab === "background") {
    const [rows, flash] = await Promise.all([backgroundPrices(false), readFlash()]);
    return (
      <>
        <AdminBar title="CPP member pricing" current="/admin/pricing" />
        <section className="section" style={{ paddingTop: 32 }}>
          <div className="wrap">
            <Flash flash={flash} />
            {tabs}
            <p className="lede" style={{ maxWidth: 820 }}>
              Enter Labb&apos;s cost for each background service. Members see the CPP price only: cost plus {CPP_MARKUP_PCT}%, rounded up to the nearest $0.05.
              For a package, enter the total cost of the checks it includes.
            </p>
            {BG_CATEGORIES.map((c) => {
              const list = rows.filter((r) => r.category === c);
              if (!list.length) return null;
              return (
                <div key={c} className="hero-card" style={{ marginTop: 24 }}>
                  <h2 className="form-title">{c}</h2>
                  <div className="bg-table-wrap">
                    <table className="bg-table bg-admin">
                      <thead><tr><th scope="col">Service</th><th scope="col" className="num">Labb cost</th><th scope="col" className="num">CPP price</th><th scope="col">Shown</th><th scope="col" /></tr></thead>
                      <tbody>
                        {list.map((r) => (
                          <tr key={r.id}>
                            <th scope="row">{r.name}{r.includes && <span className="bg-note" style={{ color: "var(--muted)" }}>{r.includes}</span>}</th>
                            <td className="num">
                              <input form={`bg-${r.id}`} name="cost" inputMode="decimal" defaultValue={cents(r.cost_cents)} aria-label={`Labb cost for ${r.name}`} className="bg-cost" />
                            </td>
                            <td className="num">{money(cppBackgroundCents(r.cost_cents))}</td>
                            <td>
                              <select form={`bg-${r.id}`} name="active" defaultValue={r.active ? "yes" : "no"} aria-label={`Show ${r.name} to members`}>
                                <option value="yes">Yes</option><option value="no">Hidden</option>
                              </select>
                            </td>
                            <td>
                              <form id={`bg-${r.id}`} action="/api/admin/pricing" method="post">
                                <input type="hidden" name="action" value="bg-update" />
                                <input type="hidden" name="id" value={r.id} />
                                <button className="btn btn-outline-dark btn-sm" type="submit">Save</button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </>
    );
  }
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
          {tabs}
          <p className="lede" style={{ maxWidth: 820 }}>
            Products and prices here appear on the CPP member Pricing page. Enter the member price and MSRP for Service Level 1 and
            Service Level 3, and the online sale price per kit (members are paid 80% of it for walk-in tests they run). Leave a price blank if it doesn&apos;t apply; an item with no prices shows &ldquo;Contact Labb&rdquo;.
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
                          <span className="muted">{i.unit ? `${i.unit} · ` : ""}SL1 {money(i.sl1_cents) || "n/a"} (MSRP {money(i.sl1_msrp_cents) || "n/a"}) · SL3 {money(i.sl3_cents) || "n/a"} (MSRP {money(i.sl3_msrp_cents) || "n/a"}) · Online {money(i.online_cents) || "n/a"}</span>
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
