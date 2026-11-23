import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { PlatformFinder } from "@/components/PlatformFinder";

export const metadata: Metadata = {
  title: "Which Labb Platform Is Right for Your Clinic?",
  description: "Check the features your clinic needs and see whether Labb Station or LabbHR fits, then get a quote. LabbHR includes discounted lab testing rates.",
  alternates: { canonical: "/find-your-platform" },
};

export default function FindYourPlatform() {
  return (
    <>
      <PageHero
        eyebrow="For clinics and collection sites"
        title="Which Labb platform is right for your clinic?"
        lede="Check the features you want. We'll show you the platform that covers them, and you can request a quote in the same step."
        primary={{ href: "#pf-features", label: "Choose features" }}
        secondary={{ href: "/compare", label: "Compare side by side" }}
      />
      <Breadcrumbs items={[{ name: "Platforms", href: "/platforms" }, { name: "Find your platform", href: "/find-your-platform" }]} />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <PlatformFinder />
          <p className="fine" style={{ marginTop: 24, textAlign: "left" }}>
            Labb Station runs the test. LabbHR runs the business and includes everything in Labb Station. Running a corrections department? See <Link href="/labbpo">LabbPO</Link>. Treatment or recovery program? See <Link href="/labbmd">LabbMD</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
