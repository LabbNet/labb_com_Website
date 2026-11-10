import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand } from "@/components/ui";
import { publishedKits } from "@/lib/kits";
import { resources } from "@/lib/resources";

export const metadata: Metadata = {
  title: "Drug Testing Handbooks and Data Sheets",
  description:
    "Free drug and background screening handbooks for construction and manufacturing, plus product data sheets with panels, cutoffs and accuracy for every Labb test kit.",
  alternates: { canonical: "/resources" },
};

export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Resources", href: "/resources" }]} />
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <span className="eyebrow">Resources</span>
          <h1>Handbooks and data sheets</h1>
          <p className="lede">Practical guides for running screening in-house, and the technical detail behind every Labb kit.</p>

          <h2 style={{ marginTop: 56 }}>Free handbooks</h2>
          <div className="grid g2" style={{ marginTop: 20 }}>
            {resources.map((r) => (
              <Link key={r.slug} href={`/resources/${r.slug}`} className="card card-link top" style={{ flexDirection: "row", gap: 22, alignItems: "center" }}>
                <Image src={r.cover} alt="" width={r.coverW} height={r.coverH} style={{ width: 120, flex: "none" }} />
                <div>
                  <h3>{r.shortTitle}</h3>
                  <p>{r.facts[0]}. {r.facts[1]}.</p>
                  <span className="more">Get the free handbook</span>
                </div>
              </Link>
            ))}
          </div>

          <h2 style={{ marginTop: 64 }}>Product data sheets</h2>
          <p className="intro">Panels, cutoffs, collection steps and accuracy data for each kit. The package insert in the box is the official performance document.</p>
          <div className="grid g3">
            {publishedKits.filter((k) => k.dataSheet).map((k) => (
              <div key={k.slug} className="card rail">
                <h3 style={{ fontSize: "1.05rem" }}>{k.name}</h3>
                <p>{k.specimen}, {k.drugCount} drugs</p>
                <p style={{ marginTop: 10 }}>
                  <a href={k.dataSheet} target="_blank" rel="noopener">Data sheet (PDF)</a> · <Link href={`/test-kits/${k.slug}`}>Kit page</Link>
                </p>
              </div>
            ))}
          </div>

          <div className="note" style={{ marginTop: 40 }}>
            <strong style={{ flex: "none" }}>Labb partners</strong>
            <span>Clinic Owners Handbooks, marketing sheets and the drug guide are in the <Link href="/library">partner library</Link>.</span>
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
