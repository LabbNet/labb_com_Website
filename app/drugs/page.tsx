import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui";
import { DrugProfileGrid } from "@/components/DrugProfileGrid";

export const metadata: Metadata = {
  title: "Drug Profiles: What Each Drug Test Detects",
  description: "Labb's Drug Profile Series: one profile per drug on Labb rapid tests, from fentanyl and kratom to EtG alcohol, with effects, workplace risk, the Labb assay and the Labb Screening Priority Index.",
  alternates: { canonical: "/drugs" },
};

export default function DrugsIndex() {
  return (
    <>
      <section className="section drug-hero">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <span className="eyebrow">Training and education</span>
          <h1>Drug Profile Series</h1>
          <p className="lede">
            One profile for every drug and alcohol test on Labb rapid tests: what it is, how it affects people at work, how the Labb assay
            reads it, and the Labb Screening Priority Index that helps you decide whether it belongs on your panel.
          </p>
          <p className="fine" style={{ textAlign: "left" }}>
            The index scores each drug from 1 to 10 on current US positivity, supply, the population at risk and harm. 1 to 3 is low, 4 to 6
            moderate, 7 to 10 high. <Link href="/test-kits">Compare kits and cutoffs</Link>.
          </p>
        </div>
      </section>
      <Breadcrumbs items={[{ name: "Training", href: "/training" }, { name: "Drug profiles", href: "/drugs" }]} />
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap"><DrugProfileGrid /></div>
      </section>
    </>
  );
}
