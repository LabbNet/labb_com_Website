import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, LabbHR } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Software for Drug Testing Businesses: TPAs, Labs, MROs | Labb",
  description:
    "LabbHR gives TPAs, laboratories, MROs, national accounts and collection sites one platform for sales, marketing, contracting and accounting, connected to the industry through One by Labb.",
  alternates: { canonical: "/drug-testing-businesses" },
};

export default function DrugTestingBusinesses() {
  return (
    <>
      <PageHero
        eyebrow="Drug testing businesses"
        title="Everything you need to grow a drug testing business, connected to the whole industry."
        lede="For national accounts, TPAs, laboratories, MROs and collection sites that want to grow."
        primary={{ href: "#demo", label: "Request a demo" }}
        secondary={{ href: "/labbhr", label: "About LabbHR" }}
      />
      <Breadcrumbs items={[{ name: "Drug testing businesses", href: "/drug-testing-businesses" }]} />

      <section className="section">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">The problem</span>
            <h2>Disconnected tools for selling, contracting and billing</h2>
            <p className="intro" style={{ marginBottom: 0 }}>
              Most drug testing businesses run sales in one place, contracts in another and billing in a third, with no easy way to connect
              with the labs, MROs, TPAs and sites they work with every day.
            </p>
          </div>
          <div className="card top">
            <h3><LabbHR /> answers it</h3>
            <Checks items={[
              "Sales, marketing, contracting and accounting in one platform",
              "Every Labb Station tool for running tests",
              "Background checks in the same platform",
              "Connected to the industry through One by Labb",
            ]} />
            <div className="btn-row"><Link href="/labbhr" className="btn btn-outline">Explore LabbHR</Link></div>
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">One by Labb</span>
            <h2>One industry, connected</h2>
            <p>Every LabbHR user joins One by Labb, where collection sites, national accounts, TPAs, laboratories, MROs and employers find and work with each other.</p>
            <div className="btn-row"><Link href="/one" className="btn btn-outline-dark">About One by Labb</Link></div>
          </div>
          <div className="card rail">
            <h3>Run a collection site?</h3>
            <p>Start with Labb Station to test better, then move to LabbHR to grow. <Link href="/compare">Compare the two</Link>.</p>
          </div>
        </div>
      </section>

      <section className="section" id="demo">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">Request a demo</span>
            <h2>See LabbHR for your business</h2>
            <p>LabbHR is in beta now. Tell us what you run and we&apos;ll show you the platform and set up access.</p>
            <p className="program-note">Your testing goals, our technology and support: Labb builds the program around your goals and keeps it on track.</p>
          </div>
          <div className="hero-card">
            <LeadForm variant="demo" segment="drug-testing-business" products={["LabbHR"]} title="Request a demo" submitLabel="Request a Demo" />
          </div>
        </div>
      </section>
    </>
  );
}
