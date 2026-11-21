import { sql } from "@/lib/db";
import { currentMember } from "@/lib/auth";
import { fmtDate } from "@/lib/admin";
import { money, PRICE_CATEGORIES, productImage, productKit, productLink, WALK_IN_SHARE, type PriceItem } from "@/lib/cppPricing";
import { cppEmail, site } from "@/lib/site";
import Link from "next/link";
import { backgroundPrices, BG_CATEGORIES, cppBackgroundCents } from "@/lib/backgroundPricing";

export const dynamic = "force-dynamic";

export default async function MemberPricing({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const m = await currentMember();
  if (!m) return null; // layout redirects to sign in
  const tab = (await searchParams).tab === "background" ? "background" : "drug";
  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", marginTop: 12 }}>CPP member pricing</h1>
        <nav className="price-tabs" aria-label="Pricing type">
          <Link href="/members/pricing" aria-current={tab === "drug" ? "page" : undefined}>Drug testing</Link>
          <Link href="/members/pricing?tab=background" aria-current={tab === "background" ? "page" : undefined}>Background checks</Link>
        </nav>
        {tab === "drug" ? <DrugPricing /> : <BackgroundPricing />}
      </div>
    </section>
  );
}

async function BackgroundPricing() {
  const rows = await backgroundPrices();
  const last = rows.reduce<Date | null>((d, i) => (!d || i.updated_at > d ? i.updated_at : d), null);
  return (
    <>
      <p className="lede">
        Your price for background screening ordered through LabbHR: individual checks and ready-made packages. Pricing is confidential to CPP
        members. Please don&apos;t share it outside your organization.
      </p>
      {last && <p className="fine-print">Last updated {fmtDate(last)}. Custom packages, volume pricing and questions: <a href={site.phoneHref}>{site.phone}</a> or <a href={`mailto:${cppEmail}`}>{cppEmail}</a>.</p>}
      <nav className="price-jump" aria-label="Background check categories">
        {BG_CATEGORIES.filter((c) => rows.some((r) => r.category === c)).map((c) => <a key={c} href={`#bg-${c.replace(/\W+/g, "-").toLowerCase()}`}>{c}</a>)}
      </nav>
      {BG_CATEGORIES.map((c) => {
        const list = rows.filter((r) => r.category === c);
        if (!list.length) return null;
        return (
          <div key={c} id={`bg-${c.replace(/\W+/g, "-").toLowerCase()}`} className="price-section">
            <h2>{c === "Packages" ? "Packages" : `${c} checks`}</h2>
            <div className="bg-table-wrap">
              <table className="bg-table">
                <thead><tr><th scope="col">Service</th><th scope="col">What&apos;s included</th><th scope="col" className="num">Your price</th></tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">{r.name}</th>
                      <td>{r.includes}{r.note && <span className="bg-note">{r.note}</span>}</td>
                      <td className="num">{money(cppBackgroundCents(r.cost_cents))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <p className="fine-print" style={{ marginTop: 28 }}>
        Prices are per search. Court, school and other third-party fees, where a source charges one, are passed through at cost. Background
        checks for employment must follow the FCRA and state law, including disclosure, authorization and adverse action notices.
      </p>
    </>
  );
}

async function DrugPricing() {
  const items = await sql()<PriceItem[]>`select * from cpp_price_items where active order by category, sort, lower(name)`;
  const last = items.reduce<Date | null>((d, i) => (!d || i.updated_at > d ? i.updated_at : d), null);

  return (
    <>
        <p className="lede">
          Service Level 1 and Service Level 3 pricing, with MSRP and the online sale price, for products and services sold through the Channel Partner Program. Pricing is confidential to CPP
          members. Please don&apos;t share it outside your organization.
        </p>
        {last && <p className="fine-print">Last updated {fmtDate(last)}. Questions on pricing or larger opportunities: <a href={site.phoneHref}>{site.phone}</a> or <a href={`mailto:${cppEmail}`}>{cppEmail}</a>.</p>}
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
                    const none = [i.sl1_cents, i.sl1_msrp_cents, i.sl3_cents, i.sl3_msrp_cents, i.online_cents].every((c) => c == null);
                    const link = productLink(i);
                    const kit = productKit(link);
                    const img = productImage(link);
                    return (
                      <div key={i.id} className="price-card">
                        <div className="pc-media">
                          {img ? <img src={img} alt="" loading="lazy" /> : <span className="pc-media-ph" aria-hidden="true">{c.label.split(" ")[0]}</span>}
                        </div>
                        <div className="pc-info">
                          <div className="pc-title">
                            <h3>{link ? <a href={link}>{i.name}</a> : i.name}</h3>
                            {i.sku && <span className="pc-sku">{i.sku}</span>}
                          </div>
                          <div className="pc-meta">
                            {i.unit && <span className="pc-pill">{i.unit}</span>}
                            {kit && <span className="pc-pill">{kit.specimen}</span>}
                            {kit && <span className="pc-pill">{kit.drugCount} {kit.drugCount === 1 ? "test" : "tests"}</span>}
                            {kit && <span className="pc-pill">{kit.use}</span>}
                          </div>
                          {i.description && <p className="pc-desc">{i.description}</p>}
                          {kit && (
                            <ul className="pc-drugs" aria-label="Drugs on this kit">
                              {kit.drugs.map((d) => <li key={d.code} title={`${d.name}, cutoff ${d.cutoff}`}>{d.code}</li>)}
                            </ul>
                          )}
                          {i.notes && <p className="pc-note"><strong>Note:</strong> {i.notes}</p>}
                          {link && <a className="pc-link" href={link}>Product details <span aria-hidden="true">&rarr;</span></a>}
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
                            {i.online_cents != null && (
                              <div className="pc-online">
                                <span><span className="pc-cost-label">Online sale price</span><strong>{money(i.online_cents)}</strong>{i.category === "rapid-kits" ? " per kit" : ""}</span>
                                <span className="pc-payout">You earn {money(Math.round(i.online_cents * WALK_IN_SHARE))} ({WALK_IN_SHARE * 100}%) when you run a walk-in test sold online in your territory</span>
                              </div>
                            )}
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
    </>
  );
}
