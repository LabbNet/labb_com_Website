import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, Faq, JsonLd, LabbHR } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "LabbHR: Business Software for Drug Testing Companies",
  description:
    "LabbHR is the business development platform for drug testing companies: sales, marketing, contracting and accounting, plus every Labb Station tool, connected through One by Labb. Now in beta.",
  alternates: { canonical: "/labbhr" },
};

const audiences = [
  { t: "National accounts", b: "Coordinate testing across sites and partners from one platform." },
  { t: "TPAs", b: "Sell, contract and bill programs without stitching tools together." },
  { t: "Laboratories", b: "Connect with the sites and businesses that send you specimens." },
  { t: "MROs", b: "Work with the TPAs, sites and employers you serve in one network." },
  { t: "Collection sites ready to grow", b: "Go beyond running tests and build a bigger testing business." },
];

const modules = [
  { t: "Sales", b: "Find, track and close new clients and programs." },
  { t: "Marketing", b: "Reach employers and partners with campaigns built for drug testing businesses." },
  { t: "Contracting", b: "Send, sign and manage client agreements in the same platform." },
  { t: "Accounting", b: "Bill clients and track what's owed without a separate system." },
];

const faqs = [
  { q: "Is LabbHR available now?", a: "LabbHR is in beta. Join the beta below and a Labb specialist will set up your access and help decide which features roll out first." },
  { q: "How is LabbHR different from Labb Station?", a: "Labb Station runs the test: objective reads, documentation, Flex Testing and lab ordering. LabbHR runs the business: sales, marketing, contracting and accounting, plus everything in Labb Station, expanded connectivity and access to One by Labb." },
  { q: "I'm already on Labb Station. Can I upgrade?", a: "Yes. LabbHR includes everything in Labb Station. Compare the two and talk to us about upgrading." },
  { q: "What is One by Labb?", a: "One by Labb is the ecosystem every LabbHR user connects to, so collection sites, national accounts, TPAs, laboratories, MROs and employers can find and work with each other." },
  { q: "What does LabbHR cost?", a: "Pricing depends on your business and the services you use. Join the beta and we'll walk you through it." },
];

export default function LabbHRPage() {
  return (
    <>
      <PageHero
        eyebrow="LabbHR · Now in beta"
        title={<>Grow your drug testing business on one platform.</>}
        lede={<>Sales, marketing, contracting and accounting, plus every Labb Station tool, connected to the rest of the industry through One by Labb.</>}
        aside={
          <div className="hero-card" id="beta" style={{ color: "var(--dark)" }}>
            <LeadForm variant="early-access" segment="drug-testing-business" products={["LabbHR"]} title="Join the LabbHR beta" subtitle="Tell us about your business and we'll set up your access." submitLabel="Join the Beta" />
          </div>
        }
      />
      <Breadcrumbs items={[{ name: "Platforms", href: "/platforms" }, { name: "LabbHR", href: "/labbhr" }]} />

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Who it&apos;s for</span>
          <h2>Built for the businesses that sell and deliver testing</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {audiences.map((a) => (
              <div key={a.t} className="card rail">
                <h3>{a.t}</h3>
                <p>{a.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <span className="eyebrow">Run the business</span>
          <h2>Software that sells, contracts and bills, not just tests</h2>
          <div className="grid g4" style={{ marginTop: 28 }}>
            {modules.map((m, i) => (
              <div key={m.t} className="card top">
                <div className="icon-dot" aria-hidden="true">{i + 1}</div>
                <h3>{m.t}</h3>
                <p>{m.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Run the testing</span>
            <h2>Everything in Labb Station, and more</h2>
            <p className="intro" style={{ marginBottom: 20 }}>
              <LabbHR /> includes every Labb Station tool, with expanded connectivity and more technology.
            </p>
            <Checks items={[
              "Objective reads of Labb rapid tests on a phone or tablet",
              "Every collection documented",
              "Flex Testing: custom rapid and lab panels from one kit",
              "Lab ordering and one-button send to lab",
              "Background checks in the same platform",
            ]} />
            <div className="btn-row"><Link href="/compare" className="btn btn-outline">Compare with Labb Station</Link></div>
          </div>
          <Image src="/img/labbhr-dashboard.webp" alt="LabbHR dashboard" width={1400} height={1400} sizes="(max-width: 900px) 92vw, 540px" />
        </div>
      </section>

      <section className="section soft">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">Connected through One by Labb</span>
            <h2>One industry, connected</h2>
            <p>
              Every <LabbHR /> user joins One by Labb, the ecosystem where collection sites, national accounts, TPAs, laboratories, MROs and
              employers find and work with each other.
            </p>
            <div className="btn-row"><Link href="/one" className="btn btn-outline-dark">About One by Labb</Link></div>
          </div>
          <div className="card rail">
            <h3>Already on Labb Station?</h3>
            <p>Keep the reader your team knows and add the tools to grow. <Link href="/compare">See what changes when you upgrade</Link>.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Questions</span>
          <h2>About LabbHR</h2>
          <Faq items={faqs} />
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap">
          <div>
            <h2>Join the LabbHR beta</h2>
            <p>Get early access and help decide which features roll out first.</p>
          </div>
          <div className="btn-row" style={{ marginTop: 0 }}>
            <Link href="#beta" className="btn btn-light">Join the Beta</Link>
            <Link href="/one" className="btn btn-ghost">About One by Labb</Link>
          </div>
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "LabbHR",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, iOS, Android",
          publisher: { "@id": `${site.url}/#org` },
          description: "Business development platform for drug testing companies: sales, marketing, contracting and accounting, plus Labb Station tools.",
        }}
      />
    </>
  );
}
