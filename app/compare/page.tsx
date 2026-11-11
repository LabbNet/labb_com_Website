import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { platforms, stationVsHr, type Cell } from "@/lib/platforms";

export const metadata: Metadata = {
  title: "Labb Station vs LabbHR: Compare Drug Testing Software",
  description:
    "Labb Station runs the test. LabbHR runs the business: sales, marketing, contracting and accounting plus every Labb Station tool. Compare them feature by feature.",
  alternates: { canonical: "/compare" },
};

function Mark({ v }: { v: Cell }) {
  if (v === true) return <span className="yes" aria-label="Included">✓</span>;
  if (v === false) return <span className="no" aria-label="Not included">–</span>;
  return <span className="soon">{v}</span>;
}

export default function Compare() {
  const { station, hr } = platforms;
  return (
    <>
      <PageHero
        eyebrow="Compare software"
        title="Labb Station or LabbHR?"
        lede="Labb Station runs the test. LabbHR runs the business, and includes everything in Labb Station."
        primary={{ href: "#compare", label: "Compare features" }}
        secondary={{ href: "/platforms", label: "All platforms" }}
      />
      <Breadcrumbs items={[{ name: "Platforms", href: "/platforms" }, { name: "Compare", href: "/compare" }]} />

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap grid g2">
          {[station, hr].map((p, i) => (
            <div key={p.key} className="card top platform-card" style={i === 1 ? { borderColor: "var(--orange)", borderWidth: 2, borderTopWidth: 4 } : undefined}>
              <span className="rule">{p.rule}</span>
              <h2 style={{ fontSize: "1.7rem" }}>{p.name}</h2>
              <p style={{ fontWeight: 600, color: "var(--dark)" }}>{p.tagline}</p>
              <p style={{ marginTop: 10 }}><strong style={{ color: "var(--dark)" }}>Built for:</strong> {p.builtFor}</p>
              <div className="btn-row">
                <Link href={p.cta.href} className="btn btn-primary">{p.cta.label}</Link>
                <Link href={p.href} className="btn btn-outline">About {p.name}</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section soft" id="compare">
        <div className="wrap">
          <span className="eyebrow">Side by side</span>
          <h2>Feature by feature</h2>
          <div className="compare-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th scope="col"><span className="visually-hidden">Feature</span></th>
                  <th scope="col">Labb Station</th>
                  <th scope="col" className="hl">LabbHR</th>
                </tr>
              </thead>
              {stationVsHr.map((g) => (
                <tbody key={g.group}>
                  <tr className="group"><th scope="rowgroup" colSpan={3}>{g.group}</th></tr>
                  {g.rows.map((r) => (
                    <tr key={r.feature}>
                      <th scope="row">{r.feature}</th>
                      <td><Mark v={r.station} /></td>
                      <td className="hl"><Mark v={r.hr} /></td>
                    </tr>
                  ))}
                </tbody>
              ))}
              <tbody>
                <tr className="group"><th scope="rowgroup" colSpan={3}>Fit</th></tr>
                <tr>
                  <th scope="row">Built for</th>
                  <td>Organizations that conduct tests</td>
                  <td className="hl">Businesses that sell and deliver testing</td>
                </tr>
                <tr>
                  <th scope="row">Availability</th>
                  <td>{station.status}</td>
                  <td className="hl">{hr.status}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="fine" style={{ marginTop: 14 }}>Running a corrections department? See <Link href="/labbpo">LabbPO</Link>.</p>
        </div>
      </section>
      <CtaBand title="Not sure which fits?" body="Tell us how you test and what you want to grow, and we'll recommend Labb Station or LabbHR." href="/contact" label="Talk to us" />
    </>
  );
}
