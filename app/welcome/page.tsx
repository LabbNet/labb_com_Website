import Link from "next/link";
import type { Metadata } from "next";
import { Checks, CtaBand, LabbHR } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { site } from "@/lib/site";

// Welcome page for newly registered clinics. Shared by link in onboarding emails, so it is
// kept out of the nav, the sitemap and search results.
export const metadata: Metadata = {
  title: "Welcome to Labb: Everything Labb Offers Your Clinic",
  description: "One overview of Labb technology, test kits, testing services and programs for clinics and collection sites.",
  alternates: { canonical: "/welcome" },
  robots: { index: false, follow: false },
};

type Item = { t: React.ReactNode; b: React.ReactNode; status?: string; href?: string; cta?: string };

const technology: Item[] = [
  {
    t: "Labb Station",
    b: "A digital reader for rapid tests. Scan the donor's ID, collect the sample, capture the test with your phone or tablet and get an accurate, unbiased result. Includes electronic chain of custody for rapid urine, rapid oral fluid and non-regulated lab tests, plus dashboards for your collectors and clients.",
    status: "Available now",
    href: "/labb-station",
    cta: "About Labb Station",
  },
  {
    t: <LabbHR />,
    b: "A complete business platform for clinics that want to grow: sales, marketing, contracting and accounting, with everything in Labb Station plus expanded connectivity.",
    status: "Now in beta",
    href: "/labbhr",
    cta: "About LabbHR",
  },
  {
    t: "One by Labb",
    b: <>The network every <LabbHR /> user connects to, linking clinics with employers, TPAs, laboratories and MROs.</>,
    status: "Included with LabbHR",
    href: "/one",
    cta: "About One by Labb",
  },
];

const coming: Item[] = [
  { t: <><LabbHR /> Reader</>, b: "A mobile app reader for rapid screens on urine, oral fluid and hair." },
  { t: <><LabbHR /> Pro Reader</>, b: "Rapid confirmation with quantitative results for employer testing, in desktop and handheld models." },
  { t: "Proctor Testing Kiosks", b: "A tablet kiosk with camera for proctored oral fluid testing with OraFlo, eTest Swab and Quantisal." },
];

const testing: Item[] = [
  { t: "Rapid urine test kits", b: "UA series multi-panel cups, including kits with alcohol (ETG) testing.", href: "/urine-drug-testing", cta: "Urine testing" },
  { t: "Rapid oral fluid test kits", b: "OR and ORF series, including the OraFlo 31C, a privacy device with coded drug names.", href: "/oral-fluid-drug-testing", cta: "Oral fluid testing" },
  { t: "Lab-based testing", b: "Urine, oral fluid and hair testing through Labb's laboratory partners, plus breath THC testing.", href: "/get-a-quote", cta: "Get a quote" },
  { t: "Background screening", b: <>Background checks ordered through <LabbHR />, so drug and background screening live in one place.</>, href: "/background-checks", cta: "Background checks" },
];

const cppBenefits = [
  "New business: Labb-funded email marketing that sends employer leads (construction, manufacturing, logistics) to your clinic",
  "Access to LabbHR, Labb's full business platform",
  "Bundled testing: Labb covers lab confirmation costs on bundled accounts, up to a 5% positive rate",
  "Optional marketing co-op programs and business development support",
  "Weekly member meetings to share pricing, wins and best practices",
  "Exclusive access to Labb guidebooks, certifications and DOT certification",
];

const training: Item[] = [
  { t: <><LabbHR /> Clinic Owners Handbook</>, b: "A complete drug testing manual, updated every quarter." },
  { t: "Background Screening Guidebook", b: "How background checks work and how to offer them legally." },
  { t: "Industry handbooks", b: "For construction and manufacturing clients, to help you sell to and support them." },
  { t: "Certifications", b: "Clinic Owner, product, software and specimen collection certifications for you and your collectors. Online exams, 90% to pass, valid for one year." },
];

const start = [
  { t: "Set up Labb Station", b: "Get your account running and add your collectors." },
  { t: "Join the CPP", b: "Start receiving leads and unlock training and certification." },
  { t: "Order your first test kits", b: "Your Labb contact will get you set up with the right kits for your clients." },
];

function Cards({ items, cols = "g3" }: { items: Item[]; cols?: string }) {
  return (
    <div className={`grid ${cols}`}>
      {items.map((i, n) =>
        i.href ? (
          <Link key={n} href={i.href} className="card top card-link">
            {i.status && <span className="pill" style={{ marginBottom: 12 }}>{i.status}</span>}
            <h3>{i.t}</h3>
            <p>{i.b}</p>
            {i.cta && <span className="more">{i.cta}</span>}
          </Link>
        ) : (
          <div key={n} className="card rail">
            {i.status && <span className="pill" style={{ marginBottom: 12 }}>{i.status}</span>}
            <h3>{i.t}</h3>
            <p>{i.b}</p>
          </div>
        ),
      )}
    </div>
  );
}

export default function Welcome() {
  return (
    <>
      <PageHero
        eyebrow="Welcome to Labb"
        title="Everything Labb offers your clinic, in one place."
        lede="Technology to run and grow your testing business, test products you can trust, and programs that bring you customers and keep your team trained."
        primary={{ href: "#get-started", label: "Get started" }}
        secondary={{ href: "/channel-partner-program", label: "About the CPP" }}
      />

      <section className="section" id="technology">
        <div className="wrap">
          <span className="eyebrow">Technology</span>
          <h2>Software that runs your testing and grows your business</h2>
          <Cards items={technology} />
          <h3 style={{ marginTop: 40, marginBottom: 16 }}>Coming in 2027</h3>
          <Cards items={coming.map((c) => ({ ...c, status: "Coming 2027" }))} />
        </div>
      </section>

      <section className="section soft" id="testing">
        <div className="wrap">
          <span className="eyebrow">Testing products and services</span>
          <h2>Everything you need to test, at your clinic or in an employer&apos;s office</h2>
          <Cards items={testing} cols="g4" />
          <p style={{ marginTop: 24 }}>
            Every kit is labeled by use: Forensic use only (FUO), Employment use only (EUO), OTC or IVD. That label tells you which clients a kit is right for.{" "}
            <Link href="/test-kits">Browse all test kits</Link>.
          </p>
        </div>
      </section>

      <section className="section" id="programs">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">Channel Partner Program</span>
            <h2>Grow with the CPP</h2>
            <p>The CPP is Labb&apos;s network of partner clinics, now over 50 members strong. Members get:</p>
            <Checks items={cppBenefits} />
            <div className="btn-row">
              <Link href="/channel-partner-program/program-details" className="btn btn-outline-dark">Program details</Link>
              <Link href="/channel-partner-program/get-started" className="btn btn-primary">Join the CPP</Link>
            </div>
          </div>
          <div>
            <span className="eyebrow">Training and certification</span>
            <h2>Keep your team sharp</h2>
            <Cards items={training} cols="g2" />
            <div className="btn-row">
              <Link href="/training" className="btn btn-outline-dark">Training and education</Link>
              <Link href="/certifications" className="btn btn-outline-dark">Certifications</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section soft" id="get-started">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <span className="eyebrow">Getting started</span>
          <h2>Three steps to get going</h2>
          <ol className="steps">
            {start.map((s, i) => (
              <li key={s.t}>
                <span className="n">{i + 1}</span>
                <div>
                  <h3>{s.t}</h3>
                  <p>{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
          <p style={{ marginTop: 28 }}>
            Questions? Email <a href={`mailto:${site.email}`}>{site.email}</a> or call <a href={site.phoneHref}>{site.phone}</a>.
          </p>
        </div>
      </section>

      <CtaBand topic="New clinic onboarding" products={["Labb Station", "LabbHR"]} secondary={{ href: "/channel-partner-program/get-started", label: "Join the CPP" }} />
    </>
  );
}
