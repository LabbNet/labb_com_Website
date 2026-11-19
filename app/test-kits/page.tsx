import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, JsonLd } from "@/components/ui";
import Image from "next/image";
import Link from "next/link";
import { KitShowcase } from "@/components/KitShowcase";
import { KitMatrix } from "@/components/KitMatrix";
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
      <section className="ks-hero">
        <div className="wrap ks-hero-in">
          <div>
            <span className="eyebrow">Labb test kits</span>
            <h1>Rapid drug tests, built to be read right.</h1>
            <p className="lede">
              Oral fluid and urine kits from 6 to 23 drugs, each designed for an objective read on Labb Station. Pick a kit to see its panel,
              cutoffs and data sheet.
            </p>
            <ul className="ks-facts">
              <li><strong>{publishedKits.length}</strong> kits</li>
              <li><strong>{publishedKits.filter((k) => k.specimen === "Urine").length}</strong> urine</li>
              <li><strong>{publishedKits.filter((k) => k.specimen === "Oral fluid").length}</strong> oral fluid</li>
              <li><strong>6 to 23</strong> drugs per kit</li>
            </ul>
            <div className="btn-row">
              <Link href="/get-a-quote" className="btn btn-primary">Get a quote</Link>
              <a href="#compare" className="btn btn-outline">Compare drugs and cutoffs</a>
            </div>
          </div>
          <Image src="/graphics/home/hero-technology.webp" alt="Labb Urine eTest cups and the Oral eTest OR:06A oral fluid test" width={1565} height={758} priority sizes="(max-width: 900px) 92vw, 640px" className="ks-hero-img" />
        </div>
      </section>
      <Breadcrumbs items={[{ name: "Test kits", href: "/test-kits" }]} />
      <KitShowcase kits={publishedKits} />
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="legend-row" aria-label="Kit categories">
            <div className="card"><span className="tag">Workplace</span><p>Employment use only (EUO), for pre-employment, random, post-accident and return to duty.</p></div>
            <div className="card"><span className="tag diag">FDA/OTC</span><p>Over-the-counter and CLIA waived use, including workplace programs and at-home collection.</p></div>
            <div className="card"><span className="tag forensic">Forensic</span><p>For forensic programs. Every kit with EtG alcohol testing is forensic.</p></div>
          </div>
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
              Workplace programs use Workplace or FDA/OTC kits. Forensic kits, including every kit with EtG alcohol, are for forensic
              programs. Labb rapid screens are for non-regulated testing; Labb also offers lab-based testing for regulated (DOT) programs.
            </span>
          </div>
        </div>
      </section>
      <CtaBand />
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
