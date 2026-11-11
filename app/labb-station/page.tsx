import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, Faq, JsonLd } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Labb Station: Digital Rapid Drug Test Reader App",
  description:
    "Labb Station turns a phone or tablet into a patented rapid drug test reader: an objective, documented result in minutes. Set it up in a breakroom, a clinic or a job site trailer.",
  alternates: { canonical: "/labb-station" },
};

const why = [
  { i: "eye", t: "Digital reading", b: "Faint lines are read the same way every time, against the same criteria for every donor." },
  { i: "lock", t: "Patented True Privacy", b: "Donor information stays protected from collection through reporting." },
  { i: "check", t: "Error prevention", b: "Guided workflows follow validated best practice and stop common mistakes." },
  { i: "phone", t: "Test anywhere", b: "Run tests at any location with the mobile app, at any hour." },
];

const faqs = [
  { q: "What devices does Labb Station read?", a: "Labb Station reads Labb UA Series urine cups and OR Series and ORF Series (OraFlo) oral fluid devices. See every kit on the test kits page." },
  { q: "Do we need to buy hardware?", a: "No. Most teams read with the phones or tablets they already have. Devices used for results should be secured with a compliant mobile device management (MDM) system." },
  { q: "Who can get a Labb Station account?", a: "Accounts are open to professional drug testing facilities, clinics, occupational health providers and in-house programs running at least 25 tests a month." },
  { q: "How is Labb Station different from LabbHR?", a: "Labb Station runs the test. LabbHR runs the business: it includes everything in Labb Station and adds sales, marketing, contracting and accounting, background checks and access to One by Labb." },
];

export default function LabbStationPage() {
  return (
    <>
      <PageHero
        eyebrow={`Labb Station · ${site.patent}`}
        title="An objective read, every time."
        lede="A phone or tablet, an app and a patented reader that turn any Labb rapid test into an objective, documented result. Set it up in a breakroom, a clinic or a job site trailer."
        primary={{ href: "/get-a-quote", label: "Request a demo" }}
        secondary={{ href: "/test-kits", label: "See compatible kits" }}
        image={{ src: "/img/phone-app.webp", alt: "Labb Station app on a phone showing a rapid test result", w: 1048, h: 818 }}
      />
      <Breadcrumbs items={[{ name: "Platforms", href: "/platforms" }, { name: "Labb Station", href: "/labb-station" }]} />

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <span className="eyebrow">Why Labb Station</span>
          <h2>Why teams switch from reading tests by eye</h2>
          <div className="grid g4" style={{ marginTop: 28 }}>
            {why.map((w) => (
              <div key={w.t} className="card feature">
                <div className="ico-plain"><Icon name={w.i} size={26} /></div>
                <h3>{w.t}</h3>
                <p>{w.b}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600 }}>Get the app:</span>
            <Image src="/brand/app-store.png" alt="Labb Station on the App Store" width={941} height={309} style={{ height: 40, width: "auto" }} />
            <Image src="/brand/google-play.png" alt="Labb Station on Google Play" width={941} height={309} style={{ height: 40, width: "auto" }} />
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap split">
          <div className="media-box" style={{ background: "transparent" }}>
            <Image src="/img/true-privacy-screens.webp" alt="Labb urine cup and OraFlo device" width={1400} height={1400} sizes="(max-width: 900px) 90vw, 460px" />
          </div>
          <div>
            <span className="eyebrow">Step by step</span>
            <h2>What a test looks like</h2>
            <ol className="steps lined" style={{ marginTop: 20 }}>
              {[
                ["Select the device and donor", "Choose the panel in the app. Scan the device barcode."],
                ["Collect", "On-screen prompts walk the collector through each step and timer."],
                ["Read", "Capture the device at the read time. The result is interpreted and saved."],
                ["Confirm if needed", "Tap Send to Lab for any non-negative. Track it to the final result."],
              ].map(([t, b], i) => (
                <li key={t}>
                  <span className="n">{i + 1}</span>
                  <div><h3>{t}</h3><p>{b}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="managed">
            <div>
              <span className="eyebrow">Fully managed testing</span>
              <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>Don&apos;t want your staff running tests? We run them for you.</h2>
              <p>Labb Station sits at your site. Labb&apos;s team proctors every collection through our telehealth platform, so none of your employees handle the process.</p>
            </div>
            <Link href="/get-a-quote" className="btn btn-primary btn-lg">Ask about managed testing</Link>
          </div>
        </div>
      </section>

      <section className="section band-dark" id="certify">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Get certified</span>
            <h2>Become a certified Labb collector</h2>
            <p>Collectors take a product certification for each device series they use, plus the Labb Station software certification. Study the PDF training guides at your own pace, then pass each online exam.</p>
            <div className="btn-row"><Link href="/certifications" className="btn btn-primary btn-lg">Start certification</Link></div>
          </div>
          <div className="cert-rows">
            <div><strong>UA Series urine cups</strong><span>Product certification</span></div>
            <div><strong>OR Series oral fluid (eTest Swab)</strong><span>Product certification</span></div>
            <div><strong>ORF Series oral fluid (OraFlo)</strong><span>Product certification</span></div>
            <div><strong>Labb Station</strong><span>Software certification</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Questions</span>
          <h2>About Labb Station</h2>
          <Faq items={faqs} />
          <p style={{ marginTop: 24 }}><Link href="/compare" className="text-link" style={{ textDecoration: "underline" }}>Compare Labb Station and LabbHR →</Link></p>
        </div>
      </section>

      <CtaBand title="See Labb Station in action" body="Request a demo and a free sample kit, and we'll walk your team through a live read." label="Request a Demo" />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Labb Station",
          applicationCategory: "BusinessApplication",
          operatingSystem: "iOS, Android",
          publisher: { "@id": `${site.url}/#org` },
          description: "Digital rapid drug test reader app for phones and tablets.",
        }}
      />
    </>
  );
}
