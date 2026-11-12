import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, Faq, JsonLd } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { LABBPO_LICENSE, labbpo } from "@/lib/platforms";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "LabbPO: Probation Offender Management and Drug Testing Software",
  description:
    "LabbPO gives probation, parole and corrections departments random selection, offender notification, test tracking, online fee collection and a guaranteed result system, all fully remote.",
  alternates: { canonical: "/labbpo" },
};

const faqs = [
  { q: "How long does it take to go live?", a: "LabbPO is configured to each department after a business analysis. A typical deployment takes about 30 days." },
  { q: "How are offenders selected for testing?", a: "Each offender is randomized individually, not by shared color groups, and notified by SMS, email, phone call, text-in or web app." },
  { q: "Can LabbPO collect offender fees?", a: "Yes. Offenders pay testing fees and probation or state fees online. As an optional benefit, Labb can process offender payments for departments that want it." },
  { q: "What happens when a collection site misses a result?", a: "Collection sites must record when an offender does not show. If a site fails to enter data, LabbPO records it as a site failure, so the offender is not marked non-compliant for someone else's mistake." },
  { q: "Does LabbPO work with on-site rapid testing?", a: "Yes. Labb Station results flow straight into LabbPO, so an on-site rapid test lands in the offender's record with an objective read." },
  { q: "Where is the data hosted?", a: "LabbPO is hosted on AWS. The database is encrypted at rest with AES-256 and audit records are kept for six years." },
];

export default function LabbPOPage() {
  return (
    <>
      <PageHero
        tone="po"
        eyebrow="LabbPO · Offender management"
        title="Manage more offenders with less effort, from anywhere."
        lede="Random selection, offender notification, test tracking and fee collection in one fully remote platform for probation, parole and corrections."
        primary={{ href: "#demo", label: "Request a consultation" }}
        secondary={{ href: "/corrections", label: "Solutions for corrections" }}
      />
      <Breadcrumbs items={[{ name: "Platforms", href: "/platforms" }, { name: "LabbPO", href: "/labbpo" }]} />

      <section className="section tight">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow po">The problem</span>
            <h2>Large caseloads, uncollected fees and results that land on the wrong person</h2>
          </div>
          <p className="intro" style={{ margin: 0 }}>
            Officers are stretched across large caseloads. Testing and supervision fees go uncollected. And when a collection site or a
            phone line fails, the offender can be marked non-compliant for a test they never had the chance to take. LabbPO is built to fix
            all three.
          </p>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <div className="grid g3">
            {labbpo.highlights.map((h, i) => (
              <div key={h.t} className="card top po">
                <div className="icon-dot po" aria-hidden="true">{i + 1}</div>
                <h3>{h.t}</h3>
                <p>{h.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap grid g2" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow po">Random selection and notification</span>
            <h2>Every offender randomized individually</h2>
            <p>No shared color groups and no daily call-in line. Each offender is selected on their own schedule and notified the way that reaches them.</p>
            <div className="notify-chips">{labbpo.notify.map((n) => <span key={n}>{n}</span>)}</div>
          </div>
          <div>
            <span className="eyebrow po">Officer tools</span>
            <h2>The whole caseload, from anywhere</h2>
            <Checks items={labbpo.officer} />
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap grid g2" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow po">Offender portal</span>
            <h2>Offenders help themselves</h2>
            <p>A self-service portal answers the questions that usually land on an officer&apos;s phone.</p>
            <Checks items={labbpo.portal} />
          </div>
          <div>
            <span className="eyebrow po">Fee collection</span>
            <h2>Collect testing and supervision fees online</h2>
            <p>
              Offenders pay testing fees and probation or state fees online. As an optional benefit, Labb can process offender payments for
              departments that want it, so collection is no longer one more job for officers.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <span className="eyebrow po">Guaranteed result system</span>
          <h2>Non-compliance only when the offender failed</h2>
          <p className="intro">
            Collection sites must enter data when an offender does not show. A site that fails to enter data is shown as a site failure, not
            as offender non-compliance. That protects the offender from a wrongly recorded violation, and protects the agency from the
            litigation risk that comes with one.
          </p>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap grid g3">
          <div className="card rail po">
            <h3>Built around your agency</h3>
            <p>LabbPO is configured to each department after a business analysis, not forced into a template. Typical deployment is about 30 days.</p>
          </div>
          <div className="card rail po">
            <h3>Objective rapid testing</h3>
            <p>Labb Station results flow straight into LabbPO, so on-site rapid tests land in the offender&apos;s record with an objective read. <Link href="/labb-station">About Labb Station</Link></p>
          </div>
          <div className="card rail po">
            <h3>Security and data</h3>
            <p>{labbpo.security.join(". ")}.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow po">Questions</span>
          <h2>About LabbPO</h2>
          <Faq items={faqs} />
        </div>
      </section>

      <section className="section soft" id="demo">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow po">Request a consultation</span>
            <h2>See LabbPO with your caseload in mind</h2>
            <p>Tell us about your department and we&apos;ll walk you through random selection, the offender portal, fee collection and the guaranteed result system.</p>
            <p className="program-note">Your testing goals, our technology and support: Labb builds the program around your goals and keeps it on track.</p>
          </div>
          <div className="hero-card">
            <LeadForm variant="demo" segment="corrections" products={["LabbPO"]} title="Request a LabbPO consultation" submitLabel="Request a consultation" />
          </div>
        </div>
      </section>

      <div className="wrap"><p className="license-line">{LABBPO_LICENSE}</p></div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "LabbPO",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          publisher: { "@id": `${site.url}/#org` },
          description: "Offender management for probation, parole and corrections: random selection, notification, test tracking and online fee collection.",
        }}
      />
    </>
  );
}
