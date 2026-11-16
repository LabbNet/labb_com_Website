import { sql } from "@/lib/db";
import { currentMember } from "@/lib/auth";
import { fmtDate } from "@/lib/admin";
import { money, PRICE_CATEGORIES, type PriceItem } from "@/lib/cppPricing";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function MemberPricing() {
  const m = await currentMember();
  if (!m) return null; // layout redirects to sign in
  const items = await sql()<PriceItem[]>`select * from cpp_price_items where active order by category, sort, lower(name)`;
  const last = items.reduce<Date | null>((d, i) => (!d || i.updated_at > d ? i.updated_at : d), null);

  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", marginTop: 12 }}>CPP member pricing</h1>
        <p className="lede">
          Service Level 1 and Service Level 3 pricing, with MSRP, for products and services sold through the Channel Partner Program. Pricing is confidential to CPP
          members. Please don&apos;t share it outside your organization.
        </p>
        {last && <p className="fine-print">Last updated {fmtDate(last)}. Questions on pricing or larger opportunities: <a href={site.phoneHref}>{site.phone}</a> or <a href={`mailto:${site.email}`}>{site.email}</a>.</p>}
        <nav className="price-jump" aria-label="Pricing categories">
          {PRICE_CATEGORIES.map((c) => <a key={c.value} href={`#${c.value}`}>{c.label}</a>)}
        </nav>
        {PRICE_CATEGORIES.map((c) => {
          const list = items.filter((i) => i.category === c.value);
          return (
            <div key={c.value} id={c.value} className="price-section">
              <h2>{c.label}</h2>
              {list.length ? (
                <div className="compare-wrap">
                  <table className="compare price-table">
                    <thead>
                      <tr>
                        <th scope="col" rowSpan={2} style={{ textAlign: "left" }}>Product</th>
                        <th scope="col" rowSpan={2}>Unit</th>
                        <th scope="colgroup" colSpan={2} className="sl-head">Service Level 1</th>
                        <th scope="colgroup" colSpan={2} className="sl-head">Service Level 3</th>
                      </tr>
                      <tr><th scope="col">Price</th><th scope="col">MSRP</th><th scope="col">Price</th><th scope="col">MSRP</th></tr>
                    </thead>
                    <tbody>
                      {list.map((i) => (
                        <tr key={i.id}>
                          <th scope="row">
                            {i.name}{i.sku && <span className="tag plain" style={{ marginLeft: 8 }}>{i.sku}</span>}
                            {i.description && <span className="sub">{i.description}</span>}
                            {i.notes && <span className="sub"><em>{i.notes}</em></span>}
                          </th>
                          <td>{i.unit || ""}</td>
                          {[i.sl1_cents, i.sl1_msrp_cents, i.sl3_cents, i.sl3_msrp_cents].every((c) => c == null) ? (
                            <td colSpan={4}>Contact Labb</td>
                          ) : (
                            <>
                              <td><strong>{money(i.sl1_cents)}</strong></td>
                              <td className="muted">{money(i.sl1_msrp_cents)}</td>
                              <td><strong>{money(i.sl3_cents)}</strong></td>
                              <td className="muted">{money(i.sl3_msrp_cents)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">Pricing coming soon. Contact Labb for a quote.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
