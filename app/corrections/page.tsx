import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, KitCard } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { publishedKits } from "@/lib/kits";
import { LABBPO_LICENSE, labbpo } from "@/lib/platforms";

export const metadata: Metadata = {
  title: "Probation and Corrections Drug Testing Software | Labb",
  description:
    "Offender management and objective rapid drug testing for probation, parole and jails. LabbPO handles random selection, notification and fee collection; Labb Station gives every rapid test an objective read.",
  alternates: { canonical: "/corrections" },
};

// Forensic kits lead on this page, ETG (alcohol) panels first.
const kits = [...publishedKits].sort((a, b) => {
  const etg = (k: (typeof publishedKits)[number]) => (k.drugs.some((d) => d.code === "ETG") ? 0 : k.badge === "FUO" ? 1 : 2);
  return etg(a) - etg(b) || b.drugCount - a.drugCount;
});

export default function Corrections() {
  return (
    <>
      <PageHero
        tone="po"
        eyebrow="Corrections · Probation, parole and jails"
        title="Manage more offenders with less effort, from anywhere."
        lede="LabbPO runs the caseload: random selection, notification, test tracking and fee collection. Labb Station gives every on-site rapid test an objective read and a record that holds up."
        primary={{ href: "#demo", label: "Request a demo" }}
        secondary={{ href: "/labbpo", label: "About LabbPO" }}
      />
      <Breadcrumbs items={[{ name: "Corrections", href: "/corrections" }]} />

      <section className="section">
        <div className="wrap">
          <span className="eyebrow po">LabbPO</span>
          <h2>Three problems LabbPO takes off your officers&apos; desks</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {labbpo.highlights.map((h, i) => (
              <div key={h.t} className="card top po">
                <div className="icon-dot po" aria-hidden="true">{i + 1}</div>
                <h3>{h.t}</h3>
                <p>{h.b}</p>
              </div>
            ))}
          </div>
          <div className="btn-row"><Link href="/labbpo" className="btn btn-outline-dark">See everything in LabbPO</Link></div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow po">Labb Station for on-site testing</span>
            <h2>An objective read on every rapid test, and a record that holds up in court.</h2>
            <p className="intro" style={{ marginBottom: 20 }}>
              Standardize screening across officers and sites, and confirm only when it matters. Rapid tests are not 100% accurate, and a
              read by eye can be swayed by sympathy, finances or other bias. Anyone reading by eye is exposed to it.
            </p>
            <Checks items={[
              "An objective digital read on every test",
              "The same process for every officer and site",
              "A documented record if the court wants an independent review",
              "Lab confirmation when needed, not on every test",
              "Results flow directly into LabbPO",
            ]} />
          </div>
          <div className="card rail po">
            <h3>The goal: catch use early, fairly</h3>
            <p>
              Early, reliable screening gets offenders into treatment sooner. An objective read and a complete record make every result fair
              to the offender and defensible for the agency.
            </p>
            <p style={{ marginTop: 14 }}><Link href="/labb-station">About Labb Station</Link></p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow po">Forensic test kits</span>
          <h2>Larger panels with ETG, tailored per court or program</h2>
          <p className="intro">
            Corrections programs can use any Labb kit. Forensic urine panels with ETG (alcohol) lead the list. Flex Testing lets you remove
            any drug from a stocked panel to fit each court or program, so one kit covers many configurations and inventory stays small.
          </p>
          <div className="grid g4">
            {kits.slice(0, 4).map((k) => <KitCard key={k.slug} kit={k} />)}
          </div>
          <div className="btn-row"><Link href="/test-kits" className="btn btn-outline-dark">See all kits</Link></div>
        </div>
      </section>

      <section className="section soft" id="demo">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow po">Request a demo</span>
            <h2>Built around your agency, live in about 30 days</h2>
            <p>LabbPO is configured to your department after a business analysis. Tell us about your caseload and we&apos;ll set up a demo and a pricing conversation for your volume.</p>
            <p className="program-note">Whatever you test, Labb has a program for it, and a support team that builds it around your goals and keeps it on track.</p>
          </div>
          <div className="hero-card">
            <LeadForm variant="demo" segment="corrections" products={["LabbPO", "Labb Station"]} title="Request a demo" submitLabel="Request a Demo" />
          </div>
        </div>
      </section>

      <div className="wrap"><p className="license-line">{LABBPO_LICENSE}</p></div>
    </>
  );
}
