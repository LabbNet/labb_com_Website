import { sql } from "@/lib/db";
import { currentMember } from "@/lib/auth";
import { fmtDate } from "@/lib/admin";
import { money, PRICE_CATEGORIES, type PriceItem } from "@/lib/cppPricing";
import { cppSupportEmails, site } from "@/lib/site";

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
        {last && <p className="fine-print">Last updated {fmtDate(last)}. Questions on pricing or larger opportunities: <a href={site.phoneHref}>{site.phone}</a> or <a href={`mailto:${cppSupportEmails[0]}`}>{cppSupportEmails[0]}</a> or <a href={`mailto:${cppSupportEmails[1]}`}>{cppSupportEmails[1]}</a>.</p>}
        <nav className="price-jump" aria-label="Pricing categories">
          {PRICE_CATEGORIES.map((c) => <a key={c.value} href={`#${c.value}`}>{c.label}</a>)}
        </nav>
        {PRICE_CATEGORIES.map((c) => {
          const list = items.filter((i) => i.category === c.value);
          return (
            <div key={c.value} id={c.value} className="price-section">
              <h2>{c.label}</h2>
              {list.length ? (
                <div className="price-cards">
                  {list.map((i) => {
                    const none = [i.sl1_cents, i.sl1_msrp_cents, i.sl3_cents, i.sl3_msrp_cents].every((c) => c == null);
                    return (
                      <div key={i.id} className="price-card">
                        <div className="pc-info">
                          <h3>{i.name}{i.sku && <span className="tag plain" style={{ marginLeft: 8 }}>{i.sku}</span>}</h3>
                          {i.unit && <span className="pc-unit">{i.unit}</span>}
                          {i.description && <p>{i.description}</p>}
                          {i.notes && <p className="pc-note">{i.notes}</p>}
                        </div>
                        {none ? (
                          <div className="pc-contact">Contact Labb for pricing</div>
                        ) : (
                          <div className="pc-levels">
                            {([
                              ["Service Level 1", i.sl1_cents, i.sl1_msrp_cents],
                              ["Service Level 3", i.sl3_cents, i.sl3_msrp_cents],
                            ] as const).map(([label, cost, msrp]) => (
                              <div key={label} className="pc-level">
                                <span className="pc-level-name">{label}</span>
                                <span className="pc-cost-label">Your cost</span>
                                <span className="pc-cost">{money(cost) || "Contact Labb"}</span>
                                <span className="pc-msrp">MSRP <strong>{money(msrp) || "n/a"}</strong></span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
