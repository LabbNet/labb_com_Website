import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { LABBMD_LICENSE } from "@/lib/platforms";

export const metadata: Metadata = {
  title: "LabbMD: Platform for Treatment and Recovery Programs",
  description: "LabbMD is Labb's platform for clinical, treatment and recovery programs.",
  alternates: { canonical: "/labbmd" },
};

// Structure placeholder. Content and SEO to be written in the page-by-page pass.
export default function LabbMD() {
  return (
    <>
      <PageHero
        tone="md"
        eyebrow="LabbMD"
        title="LabbMD for treatment and recovery."
        lede="The platform for clinical, treatment and recovery programs."
        primary={{ href: "/treatment-recovery#contact", label: "Request a consultation" }}
        secondary={{ href: "/treatment-recovery", label: "Treatment & Recovery" }}
      />
      <Breadcrumbs items={[{ name: "Platforms", href: "/platforms" }, { name: "LabbMD", href: "/labbmd" }]} />
      <section className="section">
        <div className="wrap">
          <span className="eyebrow md">Product information</span>
          <h2>About LabbMD</h2>
          <p className="intro">Product details coming soon. <Link href="/platforms">See all Labb platforms</Link>.</p>
        </div>
      </section>
      <CtaBand segment="treatment" topic="LabbMD" secondary={null} />

      <div className="wrap"><p className="license-line">{LABBMD_LICENSE}</p></div>
    </>
  );
}
