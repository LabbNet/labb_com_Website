import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, JsonLd } from "@/components/ui";
import { KitBrowser } from "@/components/KitBrowser";
import { KitMatrix } from "@/components/KitMatrix";
import { PageHeroBar } from "@/components/PageHero";
import { publishedKits } from "@/lib/kits";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Rapid Drug Test Kits: Oral Fluid and Urine Panels",
  description:
    "Compare Labb rapid drug test kits side by side: OraFlo and eTest Swab oral fluid devices and eTest Cup urine screens from 6 to 23 drugs, with cutoffs for every drug.",
  alternates: { canonical: "/test-kits" },
};

export default function Page() {
  return (
    <>
      <PageHeroBar
        eyebrow="Test kits"
        title="Explore Labb test kits"
        lede="Compare panels, drugs and cutoffs side by side, see each device, and download its data sheet. Every kit reads on Labb Station. When you know what you need, ask for a quote."
        cta={{ href: "/get-a-quote", label: "Get a quote" }}
      />
      <section className="legend" aria-label="Kit categories">
        <div className="wrap">
          <div className="card"><span className="tag">Workplace</span><p>For employment programs: pre-employment, random, post-accident and return to duty.</p></div>
          <div className="card"><span className="tag forensic">Forensic</span><p>For forensic programs. Every kit with EtG alcohol testing is forensic.</p></div>
          <div className="card"><span className="tag diag">Diagnostic</span><p>OTC and CLIA waived use, including at home collection.</p></div>
        </div>
      </section>
      <Breadcrumbs items={[{ name: "Test kits", href: "/test-kits" }]} />
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="wrap">
          <span id="urine" />
          <span id="oral" />
          <KitBrowser kits={publishedKits} />

          <div id="compare" style={{ marginTop: 72, scrollMarginTop: 120 }}>
            <span className="eyebrow">Compare</span>
            <h2>Drugs and cutoffs by kit</h2>
            <p className="intro" style={{ marginBottom: 0 }}>
              The number is the screening cutoff in ng/mL: a strip reads non-negative at or above it, so a lower number is a more sensitive
              test. Oral fluid cutoffs are much lower than urine because drug levels in saliva are lower.
            </p>
            <KitMatrix kits={publishedKits} />
          </div>
          <div className="note" style={{ marginTop: 32 }}>
            <strong style={{ flex: "none" }}>Which kit can I use?</strong>
            <span>
              Workplace programs use Workplace or Diagnostic (OTC) kits. Forensic kits, including every kit with EtG alcohol, are for forensic
              programs. Labb rapid screens are not for DOT or other federally regulated testing.
            </span>
          </div>
        </div>
      </section>
      <CtaBand title="Not sure which panel fits?" body="Tell us your policy, specimen preference and monthly volume, and we'll recommend a kit and send a quote." />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: publishedKits.map((k, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/test-kits/${k.slug}`), name: k.name })),
        }}
      />
    </>
  );
}
