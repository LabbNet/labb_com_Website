import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, JsonLd } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { backgroundServices } from "@/lib/backgroundServices";
import { BG_CATEGORIES } from "@/lib/bgCategories";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Background Checks for Employers: Criminal, Verification and Driving Records",
  description: "Employment background checks ordered with your drug testing: criminal searches, sanctions, identity, employment and education verification, MVR and more, run with FCRA consent and notices.",
  alternates: { canonical: "/background-checks" },
};
export const dynamic = "force-dynamic";

const slug = (c: string) => c.replace(/\W+/g, "-").toLowerCase();

export default async function BackgroundChecks() {
  const list = await backgroundServices();
  const packages = list.filter((s) => s.kind === "package");
  const checks = BG_CATEGORIES.filter((c) => c !== "Packages").map((c) => ({ c, items: list.filter((s) => s.kind === "check" && s.category === c) })).filter((g) => g.items.length);

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Service", name: "Employment background checks", provider: { "@type": "Organization", name: "Labb", url: absoluteUrl("/") },
        areaServed: "US", url: absoluteUrl("/background-checks"),
        hasOfferCatalog: { "@type": "OfferCatalog", name: "Background check services", itemListElement: list.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.name } })) },
      }} />
      <section className="section drug-hero">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">Background screening</span>
            <h1>Background checks, ordered with your drug testing.</h1>
            <p className="lede">
              Criminal searches, sanctions and watch lists, identity checks, employment and education verification and driving records, in the same
              program as your drug and alcohol testing and physicals. One partner, one order and one place to see every result.
            </p>
            <ul className="checks" style={{ marginTop: 18 }}>
              <li>Ready-made packages, or build your own from individual checks</li>
              <li>Run with the candidate consent, disclosures and adverse action notices the FCRA requires</li>
              <li>Ordered and tracked in LabbHR, alongside drug testing</li>
            </ul>
            <div className="btn-row">
              <a href="#services" className="btn btn-primary">See all services</a>
              <a href="#get" className="btn btn-outline-dark">Get pricing</a>
            </div>
          </div>
          <div className="hero-card" id="get">
            <LeadForm variant="quote" title="Get background check pricing" subtitle="Tell us what you screen for. We'll recommend a package and send pricing." submitLabel="Get pricing" topic="Background checks" segment="employer" />
          </div>
        </div>
      </section>
      <Breadcrumbs items={[{ name: "Employers", href: "/employers" }, { name: "Background checks", href: "/background-checks" }]} />

      <section className="section" id="services" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <span className="eyebrow">Packages</span>
          <h2>Background check packages</h2>
          <p className="intro">The most-ordered combinations for pre-employment screening. Add individual checks to any package.</p>
          <div className="bg-pack-grid">
            {packages.map((p) => (
              <div key={p.ref} className="bg-pack">
                <h3>{p.name}</h3>
                {p.includes && <p>{p.includes}</p>}
                {p.note && <p className="bg-note">{p.note}</p>}
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: 56 }}>Individual checks</h2>
          <p className="intro">Order on their own or add them to a package.</p>
          <nav className="price-jump" aria-label="Check categories">
            {checks.map((g) => <a key={g.c} href={`#${slug(g.c)}`}>{g.c}</a>)}
          </nav>
          <div className="bg-check-grid">
            {checks.map((g) => (
              <div key={g.c} id={slug(g.c)} className="bg-check-group">
                <h3>{g.c}</h3>
                <ul>
                  {g.items.map((s) => (
                    <li key={s.ref}>
                      <strong>{s.name}</strong>
                      {s.includes && <span>{s.includes}</span>}
                      {s.note && <span className="bg-note">{s.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {!list.length && <p className="muted">Our background check menu is being updated. <Link href="/get-a-quote">Ask for the current list</Link>.</p>}
          <p className="fine" style={{ textAlign: "left", marginTop: 32, maxWidth: 820 }}>
            Some county, statewide and verification searches carry court, school or employer fees, passed through at cost. Employers using
            background checks for hiring decisions must follow the Fair Credit Reporting Act and state and local law, including written disclosure,
            candidate authorization and pre-adverse and adverse action notices. Labb provides general information, not legal advice.
          </p>
        </div>
      </section>
    </>
  );
}
