import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, Faq, JsonLd, LabbHR } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "LabbHR: Drug Testing and Background Screening Platform",
  description:
    "LabbHR puts rapid tests, lab testing, confirmations, MRO results and background checks in one record per candidate. Includes the Labb Station reader. Request early access.",
  alternates: { canonical: "/labbhr" },
};

const capabilities = [
  { t: "Everything in Labb Station", b: "Objective digital reads of Labb rapid tests, True Privacy and results documented automatically." },
  { t: "Lab testing and eCCF", b: "Order lab-based tests with an electronic chain of custody, without paper forms." },
  { t: "Confirmations and MRO results", b: "Lab confirmations and Medical Review Officer results land in the same record as the screen." },
  { t: "Background checks", b: "Order background checks and see them next to drug test results." },
  { t: "One record per candidate", b: "From the first screen to the final result, everything about a candidate is in one place, ready for audit." },
  { t: "Built for HR teams", b: "See where every candidate stands across locations, without chasing clinics or labs." },
];

const faqs = [
  { q: "Is LabbHR available now?", a: "LabbHR is in early access. Request access below and a Labb specialist will tell you when your account can be set up. Labb Station is available now." },
  { q: "Do I need Labb Station as well?", a: "No. LabbHR includes everything in Labb Station, so you get the reader as part of the platform." },
  { q: "Can clinics use LabbHR?", a: "Yes. Clinics and collection sites get LabbHR through the Labb Channel Partner Program." },
  { q: "What does LabbHR cost?", a: "Pricing depends on your volume and the services you use. Request access and we'll send a quote." },
];

export default function LabbHRPage() {
  return (
    <>
      <PageHero
        eyebrow="LabbHR platform · Early access"
        title={<>Drug testing and background checks, finally in one place.</>}
        lede={<><LabbHR /> brings rapid tests, lab testing, confirmations, MRO results and background checks together in one record per candidate, with the Labb Station reader built in.</>}
        aside={
          <div className="hero-card" id="access" style={{ color: "var(--dark)" }}>
            <LeadForm variant="early-access" products={["LabbHR"]} title="Request early access" subtitle="Tell us about your program and we'll reach out about LabbHR access." submitLabel="Request Early Access" />
          </div>
        }
      />
      <Breadcrumbs items={[{ name: "Software", href: "/software" }, { name: "LabbHR", href: "/labbhr" }]} />
      <section className="section tight">
        <div className="wrap">
          <Checks items={["Rapid results from Labb Station, live", "Lab confirmations and MRO results in the same record", "Background checks built in"]} />
          <div className="btn-row"><Link href="/software" className="btn btn-outline">Compare with Labb Station</Link></div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">What LabbHR does</span>
          <h2>The whole screening process, in one platform</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {capabilities.map((c, i) => (
              <div key={c.t} className="card top">
                <div className="icon-dot" aria-hidden="true">{i + 1}</div>
                <h3>{c.t}</h3>
                <p>{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap split">
          <div>
            <span className="eyebrow">For HR teams</span>
            <h2>Stop chasing clinics, labs and screening vendors</h2>
            <p className="intro">
              Today a single hire can mean a clinic visit, a lab result, an MRO call and a separate background check portal. <LabbHR />{" "}
              keeps all of it in one candidate record, so HR can see status at a glance and every result is documented.
            </p>
            <Checks items={["One login for drug tests and background checks", "Every result time-stamped and audit ready", "Works across all your locations"]} />
          </div>
          <Image src="/img/labbhr-dashboard.webp" alt="LabbHR dashboard showing a candidate's documented screening results" width={1400} height={1400} sizes="(max-width: 900px) 92vw, 540px" />
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
            <h2>Be first on LabbHR</h2>
            <p>Request early access and help shape which features roll out first.</p>
          </div>
          <div className="btn-row" style={{ marginTop: 0 }}>
            <Link href="#access" className="btn btn-light">Request Early Access</Link>
            <Link href="/labb-station" className="btn btn-ghost">See Labb Station</Link>
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
          description: "Drug testing and background screening platform for employers and clinics.",
        }}
      />
    </>
  );
}
