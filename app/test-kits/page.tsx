import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, JsonLd, KitCard } from "@/components/ui";
import { KitMatrix } from "@/components/KitMatrix";
import { publishedKits } from "@/lib/kits";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Rapid Drug Test Kits: Oral Fluid and Urine Panels",
  description:
    "Compare Labb rapid drug test kits: OraFlo and eTest Swab oral fluid devices and eTest Cup urine screens from 6 to 23 drugs, with cutoffs for every drug.",
  alternates: { canonical: "/test-kits" },
};

export default function Page() {
  const groups = [
    { title: "Oral fluid", kits: publishedKits.filter((k) => k.specimen === "Oral fluid") },
    { title: "Urine", kits: publishedKits.filter((k) => k.specimen === "Urine") },
  ];
  return (
    <>
      <Breadcrumbs items={[{ name: "Test kits", href: "/test-kits" }]} />
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <span className="eyebrow">Labb test kits</span>
          <h1>Rapid drug test kits</h1>
          <p className="lede">
            Oral fluid and urine screens built to be read digitally with Labb Station. Labb kits are sold through quotes, so pricing fits your volume and
            program. Ask us which panel fits your policy and your state.
          </p>
          {groups.map((g) => (
            <div key={g.title} style={{ marginTop: 56 }}>
              <h2>{g.title} kits</h2>
              <div className="grid g3" style={{ marginTop: 20 }}>
                {g.kits.map((k) => <KitCard key={k.slug} kit={k} />)}
              </div>
            </div>
          ))}
          <h2 id="compare" style={{ marginTop: 64 }}>Compare every panel</h2>
          <p className="intro">Cutoffs in ng/mL. Oral fluid cutoffs are lower than urine cutoffs because drug levels in saliva are lower.</p>
          <KitMatrix kits={publishedKits} />
          <div className="note" style={{ marginTop: 40 }}>
            <strong style={{ flex: "none" }}>Which kit can I use?</strong>
            <span>
              Workplace programs use Workplace or OTC kits. Forensic kits (including every kit with EtG alcohol) are for forensic programs.
              Labb rapid screens are not for DOT or other federally regulated testing.
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
