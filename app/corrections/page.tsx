import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, KitCard } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { publishedKits } from "@/lib/kits";
import { LABBPO_LICENSE, labbpo } from "@/lib/platforms";

export const metadata: Metadata = {
  title: "Probation and Corrections Drug Testing Software",
  description:
    "Offender management and drug testing for probation, parole and jails. LabbPO handles random selection, notification, test tracking and fee collection, with forensic test kits built for courts and programs.",
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
        lede="LabbPO runs the caseload: random selection, notification, test tracking and fee collection, so officers spend less time on paperwork and more time with the people they supervise."
        primary={{ href: "#demo", label: "Request a consultation" }}
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
            <span className="eyebrow po">Request a consultation</span>
            <h2>Built around your agency, live in about 30 days</h2>
            <p>LabbPO is configured to your department after a business analysis. Tell us about your caseload and we&apos;ll set up a consultation and pricing for your volume.</p>
            <p className="program-note">Your testing goals, our technology and support: Labb builds the program around your goals and keeps it on track.</p>
          </div>
          <div className="hero-card">
            <LeadForm variant="demo" segment="corrections" products={["LabbPO"]} title="Request a consultation" submitLabel="Request a consultation" />
          </div>
        </div>
      </section>

      <div className="wrap"><p className="license-line">{LABBPO_LICENSE}</p></div>
    </>
  );
}
