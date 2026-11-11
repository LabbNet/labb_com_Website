import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, Faq } from "@/components/ui";
import { CppNav } from "@/components/CppNav";
import { PageHero } from "@/components/PageHero";
import { benefits, faqs } from "@/lib/cpp";

export const metadata: Metadata = {
  title: "CPP Program Details: Benefits, Costs and Requirements | Labb",
  description: "Labb Channel Partner Program benefits, costs and member requirements for clinics and collection sites.",
  alternates: { canonical: "/channel-partner-program/program-details" },
};

// Placeholder lists, to be completed from the CPP agreement during the content pass.
const costs = [
  "Program fees are set out in the Channel Partner Program Agreement",
  "1.75% member card processing rate through the Labb point of sale",
  "Optional co-op marketing programs",
];
const requirements = [
  "An independent clinic or collection site",
  "A signed Channel Partner Program Agreement",
  "Advance notice to Labb for any account over 500 tests a month",
];

export default function CppDetails() {
  return (
    <>
      <PageHero
        eyebrow="Channel Partner Program · Program details"
        title="Benefits, costs and requirements."
        lede="Everything below is included in, or available through, the Channel Partner Program Agreement."
        primary={{ href: "/channel-partner-program/get-started", label: "Get started" }}
      />
      <Breadcrumbs items={[{ name: "Partner program", href: "/channel-partner-program" }, { name: "Program details", href: "/channel-partner-program/program-details" }]} />
      <CppNav current="/channel-partner-program/program-details" />

      <section className="section" id="benefits">
        <div className="wrap">
          <span className="eyebrow">Benefits</span>
          <h2>What CPP members get</h2>
          <div className="grid g4" style={{ marginTop: 28 }}>
            {benefits.map((b) => (
              <div key={b.t} className="card top">
                <span className="eyebrow" style={{ marginBottom: 10, fontSize: "0.7rem" }}>{b.tag}</span>
                <h3>{b.t}</h3>
                <p>{b.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap grid g2" style={{ alignItems: "start" }}>
          <div id="costs">
            <span className="eyebrow">Costs</span>
            <h2>What it costs</h2>
            <Checks items={costs} />
          </div>
          <div id="requirements">
            <span className="eyebrow">Requirements</span>
            <h2>What members need</h2>
            <Checks items={requirements} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Questions</span>
          <h2>Program questions</h2>
          <Faq items={faqs} />
          <div className="btn-row"><Link href="/channel-partner-program/get-started" className="btn btn-primary">Get started</Link></div>
        </div>
      </section>
    </>
  );
}
