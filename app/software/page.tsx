import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, Faq } from "@/components/ui";
import { comparison, software, type Cell } from "@/lib/software";

export const metadata: Metadata = {
  title: "Labb Station vs LabbHR: Compare Drug Testing Software",
  description:
    "Compare Labb's two software options: Labb Station, the rapid drug test reader app, and LabbHR, the platform for rapid tests, lab testing and background checks.",
  alternates: { canonical: "/software" },
};

function Mark({ v }: { v: Cell }) {
  if (v === true) return <span className="yes" aria-label="Included">✓</span>;
  if (v === false) return <span className="no" aria-label="Not included">–</span>;
  return <span className="soon">{v}</span>;
}

const faqs = [
  { q: "Which one should I choose?", a: "If you run rapid tests and want an objective, documented read, Labb Station covers it. If your team also manages lab tests, confirmations, MRO results or background checks, choose LabbHR." },
  { q: "Can I start with Labb Station and move to LabbHR later?", a: "Yes. LabbHR includes everything in Labb Station, so your team keeps the same reading workflow when you upgrade." },
  { q: "Do both work with all Labb test kits?", a: "Yes. Both read Labb UA Series urine cups and OR and ORF Series oral fluid devices." },
  { q: "How is each priced?", a: "Pricing depends on your volume and the services you use. Request a quote and we'll price the option that fits." },
];

export default function SoftwarePage() {
  const cols = [software.station, software.hr];
  return (
    <>
      <Breadcrumbs items={[{ name: "Software", href: "/software" }]} />
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Labb software</span>
            <h1>Labb Station or LabbHR?</h1>
            <p className="lede">Two ways to run screening with Labb. Start with the reader, or manage the whole process in one platform.</p>
          </div>

          <div className="grid g2" style={{ marginTop: 40 }}>
            {cols.map((s, i) => (
              <div key={s.name} className="card top" style={{ display: "flex", flexDirection: "column", ...(i === 1 ? { borderColor: "var(--orange)", borderWidth: 2, borderTopWidth: 4 } : {}) }}>
                <span className={`pill${i === 0 ? "" : " soon-pill"}`}>{s.status}</span>
                <h2 style={{ fontSize: "1.8rem", margin: "14px 0 2px" }}>{s.name}</h2>
                <p style={{ fontWeight: 600, color: "var(--dark)", marginBottom: 12 }}>{s.tagline}</p>
                <p>{s.summary}</p>
                <p style={{ marginTop: 14 }}><strong style={{ color: "var(--dark)" }}>Best for:</strong> {s.bestFor}</p>
                <div className="btn-row" style={{ marginTop: "auto", paddingTop: 22 }}>
                  {i === 0 ? (
                    <>
                      <Link href="/get-a-quote" className="btn btn-primary">Request a Demo</Link>
                      <Link href={s.href} className="btn btn-outline">About Labb Station</Link>
                    </>
                  ) : (
                    <>
                      <Link href="/labbhr#access" className="btn btn-primary">Request Early Access</Link>
                      <Link href={s.href} className="btn btn-outline">About LabbHR</Link>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <span className="eyebrow">Side by side</span>
          <h2>Compare features</h2>
          <div className="compare-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th scope="col"><span className="visually-hidden">Feature</span></th>
                  <th scope="col">Labb Station</th>
                  <th scope="col" className="hl">LabbHR</th>
                </tr>
              </thead>
              {comparison.map((g) => (
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
                <tr className="group"><th scope="rowgroup" colSpan={3}>Availability</th></tr>
                <tr>
                  <th scope="row">Status</th>
                  <td>{software.station.status}</td>
                  <td className="hl">{software.hr.status}</td>
                </tr>
                <tr>
                  <th scope="row">Where to get it</th>
                  <td>App Store and Google Play</td>
                  <td className="hl">Request access. Clinics through the <Link href="/channel-partner-program">CPP</Link></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Questions</span>
          <h2>Choosing your software</h2>
          <Faq items={faqs} />
        </div>
      </section>
      <CtaBand title="Not sure which fits?" body="Tell us how your team tests today and we'll recommend Labb Station or LabbHR, with a quote." />
    </>
  );
}
