import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Checks, CtaBand, Faq, KitCard, LabbHR } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { industries } from "@/lib/industries";
import { publishedKits } from "@/lib/kits";
import { resources } from "@/lib/resources";

export const metadata: Metadata = {
  title: { absolute: "Rapid Drug Testing for Employers, Read Objectively | Labb" },
  description:
    "Run rapid drug testing in-house. Labb oral fluid and urine screens are read by the LabbHR digital reader on a phone or tablet, with results in minutes and documented automatically.",
  alternates: { canonical: "/" },
};

const featured = ["orf-31c-oraflo", "or-14a-etest-swab", "ua-13a-svt", "ua-16c-svt"];

const faqs = [
  {
    q: "Can employers run their own drug tests?",
    a: "Yes, for company (non-DOT) testing. Employers run rapid screens in-house with a written policy, trained collectors and lab confirmation of every non-negative result. Labb provides the devices, the LabbHR reader, training documents and online certification.",
  },
  {
    q: "How does the LabbHR reader work?",
    a: "After collection, the collector captures the device with the LabbHR app on a phone or tablet. The result is read digitally, time-stamped and stored against the donor record, so every person is read against the same criteria.",
  },
  {
    q: "Oral fluid or urine: which should we use?",
    a: "Oral fluid is collected in plain view with no restroom and shows recent use, which suits post-accident and reasonable suspicion testing. Urine has a longer detection window and wider panels, which suits pre-employment and random testing. Many employers use both.",
  },
  {
    q: "What happens after a non-negative screen?",
    a: "A rapid screen is preliminary. Every non-negative is sent to a laboratory for confirmation and Medical Review Officer review before any employment decision.",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <span className="eyebrow">Rapid drug testing for employers</span>
            <h1>
              Test in-house. Get a fair, <span className="em">objective</span> read every time.
            </h1>
            <p className="lede">
              Labb oral fluid and urine screens are read by the <LabbHR /> digital reader on a phone or tablet. Results in minutes,
              documented automatically, with no guesswork over faint lines.
            </p>
            <div className="btn-row">
              <Link href="/get-a-quote" className="btn btn-primary">Get a Quote</Link>
              <Link href="/get-a-quote?sample=1" className="btn btn-outline">Request a Sample</Link>
            </div>
            <Checks items={["Results in 5 to 10 minutes", "Oral fluid and urine panels from 6 to 23 drugs", "Patented True Privacy with Real Protection™"]} />
          </div>
          <div className="hero-media">
            <Image src="/img/phone-reader.webp" alt="A phone running the LabbHR app reading a rapid drug test result" width={1400} height={1400} priority sizes="(max-width: 900px) 92vw, 540px" />
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <div className="stats">
            <div><strong>5 to 10 min</strong><span>From collection to a documented result</span></div>
            <div><strong>6 to 23</strong><span>Drugs per panel, oral fluid or urine</span></div>
            <div><strong>0</strong><span>Paper forms to fill out or file</span></div>
            <div><strong>Patented</strong><span>True Privacy technology</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Who we help</span>
            <h2>Two ways to work with Labb</h2>
          </div>
          <div className="grid g2" style={{ marginTop: 32 }}>
            <div className="card top">
              <h3>Employers testing in-house</h3>
              <p>
                Construction, manufacturing, logistics and other employers who want faster hiring and post-incident testing on site,
                without sending people to a clinic.
              </p>
              <div className="btn-row">
                <Link href="/get-a-quote" className="btn btn-primary">Get a Quote</Link>
                <Link href="/labbhr" className="btn btn-outline">See how it works</Link>
              </div>
            </div>
            <div className="card top">
              <h3>Clinics and collection sites</h3>
              <p>
                Bring Labb rapid testing and the <LabbHR /> platform into your facility, and grow with employer accounts through the
                Labb Channel Partner Program.
              </p>
              <div className="btn-row">
                <Link href="/for-clinics" className="btn btn-primary">Partner with Labb</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Why a digital reader</span>
            <h2>The same read for every person, every time.</h2>
            <p className="intro" style={{ marginBottom: 20 }}>
              Reading a rapid test by eye invites judgment calls. What a collector has just heard, what they expect or how a day is
              going can change how the same faint line gets called. The <LabbHR /> reader applies the same criteria to every device
              and every donor.
            </p>
            <p className="intro">An objective read protects the employee, the employer and the collector.</p>
            <Checks
              items={[
                "Consistent, objective results for every person",
                "Every result time-stamped and stored against the donor record",
                "Guided collection steps that prevent common errors",
                "Drug names masked on OraFlo devices to protect donor privacy",
              ]}
            />
          </div>
          <Image src="/img/labbhr-dashboard.webp" alt="LabbHR dashboard showing a documented drug screen result" width={1400} height={1400} sizes="(max-width: 900px) 92vw, 560px" />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Choose your specimen</span>
          <h2>Oral fluid, urine, or both</h2>
          <div className="grid g2" style={{ marginTop: 28 }}>
            <Link href="/oral-fluid-drug-testing" className="card card-link rail">
              <h3>Oral fluid drug testing</h3>
              <p>Observed collection anywhere, no restroom needed, and detection of recent use. Strong for post-accident and reasonable suspicion testing.</p>
              <span className="more">Oral fluid testing</span>
            </Link>
            <Link href="/urine-drug-testing" className="card card-link rail">
              <h3>Urine drug testing</h3>
              <p>A longer detection window, panels from 6 to 23 drugs and built-in specimen validity checks. Strong for pre-employment and random testing.</p>
              <span className="more">Urine testing</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <span className="eyebrow">Popular kits</span>
          <h2>Panels employers use most</h2>
          <p className="intro">Every kit reads on the <LabbHR /> reader. We&apos;ll recommend the right panel for your policy and your state.</p>
          <div className="grid g4">
            {featured.map((s) => publishedKits.find((k) => k.slug === s)!).map((k) => <KitCard key={k.slug} kit={k} />)}
          </div>
          <div className="btn-row"><Link href="/test-kits" className="btn btn-outline">See all test kits</Link></div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Industries</span>
          <h2>Built for teams that can&apos;t wait on a clinic</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {industries.map((i) => (
              <Link key={i.slug} href={`/industries/${i.slug}`} className="card card-link top">
                <h3>{i.name}</h3>
                <p>{i.lede}</p>
                <span className="more">Drug testing for {i.name.toLowerCase()}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Free handbooks</span>
            <h2>Bring screening in-house, and do it right.</h2>
            <p className="intro">
              Practical training guides on law, policy, collection, background checks and moving testing in-house, each with a
              certification practice exam.
            </p>
            <div className="grid" style={{ gap: 12 }}>
              {resources.map((r) => (
                <Link key={r.slug} href={`/resources/${r.slug}`} className="card card-link rail" style={{ padding: 18 }}>
                  <h3 style={{ fontSize: "1.05rem", margin: 0 }}>{r.shortTitle}</h3>
                  <span className="more" style={{ paddingTop: 6 }}>Get the free handbook</span>
                </Link>
              ))}
            </div>
          </div>
          <Image src="/img/construction-handbook.webp" alt="LabbHR Construction Screening Handbook cover" width={913} height={1000} sizes="(max-width: 900px) 80vw, 420px" style={{ maxWidth: 420, margin: "0 auto" }} />
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Common questions</span>
            <h2>Drug testing in-house, answered</h2>
            <Faq items={faqs} />
          </div>
          <div className="hero-card" id="quote">
            <LeadForm variant="quote" compact title="Get a quote" subtitle="A Labb specialist will reply shortly." />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
