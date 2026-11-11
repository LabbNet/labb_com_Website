import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Checks } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Rapid Drug Testing Read Digitally by Labb Station | Labb" },
  description:
    "Labb Station reads every rapid drug test digitally, documents the result and keeps donor information private. Oral fluid or urine, at your site or anywhere your people work.",
  alternates: { canonical: "/" },
};

// Layout follows the "Labb Redesign (Draft)" Shopify theme.
const bias = [
  {
    t: "Expectation",
    b: 'An employee mentions an antibiotic, something from months ago, or "I took Tylenol and Advil." Most people don\'t know what a test detects or for how long. Once a collector expects a positive, a faint line starts to look like one.',
  },
  { t: "Sympathy", b: "When someone is clearly struggling, it is natural to want to give them the benefit of the doubt. A kind instinct can still produce the wrong result." },
  { t: "First impressions", b: "Assumptions about who uses drugs can shape what a person sees on a test, usually without anyone realizing it." },
  { t: "Outside pressure", b: "Every testing site feels cost and workload pressure. A result should never lean one way because of what comes next." },
];

const vs = [
  ["Interpreting the result", "Shaped by what the collector heard, expects or assumes.", "The same criteria for every device, every donor."],
  ["Faint lines", "Can look negative to one person and positive to another.", "Measured, not judged."],
  ["Recording it", "Handwritten or typed in later.", "Saved electronically the moment it is read."],
  ["Employee privacy", "A supervisor or coworker sees and judges the result.", "Patented True Privacy: drug names are masked on the device and decoded privately."],
  ["If a result is challenged", "It comes down to one person's judgment.", "An objective, documented record to stand behind."],
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <Link href="/labbhr" className="announce">
              <b>New:</b> LabbHR drug testing and background checks in one place
            </Link>
            <h1>An objective read, controlled by software.</h1>
            <p className="lede">
              Labb Station reads every rapid drug test digitally, documents the result, and keeps donor information private. Oral fluid or
              urine, at your site or anywhere your people work.
            </p>
            <div className="btn-row">
              <Link href="/get-a-quote?sample=1" className="btn btn-primary btn-lg">Request a free sample</Link>
              <Link href="/test-kits" className="btn btn-outline btn-lg">Explore test kits</Link>
            </div>
            <p style={{ marginTop: 18, fontSize: "0.9rem", color: "var(--muted)" }}>
              Already a customer? <a href={site.clientLogin} rel="nofollow">Log in to your account</a>
            </p>
          </div>
          <div className="hero-media">
            <Image src="/img/phone-reader.webp" alt="A phone running the Labb Station app reading a rapid drug test result" width={1400} height={1400} priority sizes="(max-width: 900px) 92vw, 520px" />
          </div>
        </div>
      </section>

      <section className="trust" aria-label="Why Labb">
        <div className="wrap">
          <div><Icon name="shield" /><p style={{ margin: 0 }}><strong>Patented reader</strong><span>{site.patent}</span></p></div>
          <div><Icon name="doc" /><p style={{ margin: 0 }}><strong>Every result documented</strong><span>Electronic record, no handwriting</span></p></div>
          <div><Icon name="eye" /><p style={{ margin: 0 }}><strong>An objective read</strong><span>The same criteria for every donor</span></p></div>
          <div><Icon name="lock" /><p style={{ margin: 0 }}><strong>True Privacy™</strong><span>Drug names masked on the device</span></p></div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Start here</span>
          <h2>What do you need today?</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            <Link href="/test-kits" className="card card-link">
              <div className="ico"><Icon name="box" size={22} /></div>
              <h3>Explore test kits</h3>
              <p>Compare urine and oral fluid panels, drugs and cutoffs, and download data sheets. Then ask for a quote.</p>
              <span className="more-row">Browse kits →</span>
            </Link>
            <Link href="/get-a-quote?sample=1" className="card card-link hl">
              <div className="ico solid"><Icon name="check" size={22} /></div>
              <h3>Start a testing program</h3>
              <p>Tell us about your workforce. We will recommend panels, send a free sample, and get you certified.</p>
              <span className="more-row">Request a sample →</span>
            </Link>
            <Link href="/labbhr" className="card card-link">
              <div className="ico"><Icon name="chart" size={22} /></div>
              <h3>Manage screening in LabbHR</h3>
              <p>Drug tests, lab confirmations and background checks, tracked in one place for your HR team.</p>
              <span className="more-row">Request early access →</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <div className="head-row">
            <div>
              <span className="eyebrow">Why a digital reader</span>
              <h2 style={{ margin: 0 }}>Good collectors are still human. A reader takes human bias out of the result.</h2>
            </div>
            <p>
              Faint lines are only part of the problem. The bigger one is context. What a collector has just heard, felt or assumed can
              change how they read the same line. Labb Station reads only the device.
            </p>
          </div>
          <div className="grid g4">
            {bias.map((b) => (
              <div key={b.t} className="card top">
                <h3>{b.t}</h3>
                <p>{b.b}</p>
              </div>
            ))}
          </div>
          <div className="callout-dark">
            <div>
              <h3>The reader sees the device. Nothing else.</h3>
              <p>
                The same criteria for every device, every time, saved electronically the moment it is read. The donor gets a fair read,
                the collector is never second-guessed, and the employer gets a result it can stand behind.
              </p>
            </div>
            <Link href="/labb-station" className="btn btn-primary btn-lg">See the reader in action</Link>
          </div>
          <table className="vs">
            <caption className="visually-hidden">Reading rapid tests by eye compared with the Labb Station digital reader</caption>
            <thead>
              <tr>
                <th scope="col"><span className="visually-hidden">Step</span></th>
                <th scope="col">Reading by eye</th>
                <th scope="col" className="reader">Labb Station digital reader</th>
              </tr>
            </thead>
            <tbody>
              {vs.map(([s, eye, reader]) => (
                <tr key={s}>
                  <th scope="row">{s}</th>
                  <td>{eye}</td>
                  <td className="reader">{reader}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fine" style={{ textAlign: "left" }}>Labb Station reader technology: {site.patent}</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div className="media-box">
            <Image src="/img/true-privacy-screens.webp" alt="Labb urine cup and OraFlo oral fluid device read by Labb Station" width={1400} height={1400} sizes="(max-width: 900px) 90vw, 460px" />
          </div>
          <div>
            <span className="eyebrow">How Labb Station works</span>
            <h2>Four steps. No guesswork.</h2>
            <ol className="steps" style={{ marginTop: 20 }}>
              {[
                ["Collect", "The app walks the collector through each step, so nothing gets skipped."],
                ["Scan", "Scan the device barcode. The test is matched to the donor automatically."],
                ["Read", "Labb Station interprets the result. No squinting at faint lines, no judgment calls."],
                ["Report", "Results land in your account. Non-negatives go to the lab for confirmation in one step."],
              ].map(([t, b], i) => (
                <li key={t}>
                  <span className="n">{i + 1}</span>
                  <div><h3>{t}</h3><p>{b}</p></div>
                </li>
              ))}
            </ol>
            <p style={{ marginTop: 22 }}><Link href="/labb-station" className="text-link" style={{ textDecoration: "underline" }}>See Labb Station in detail →</Link></p>
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
            <div>
              <span className="eyebrow">Test kits</span>
              <h2 style={{ margin: 0 }}>Choose your specimen</h2>
            </div>
            <Link href="/test-kits#compare" className="text-link" style={{ textDecoration: "underline" }}>Compare all kits →</Link>
          </div>
          <div className="grid g2" style={{ marginTop: 28 }}>
            <div className="card spec-card">
              <div className="ph"><Image src="/img/oral-fluid-devices.webp" alt="Labb oral fluid drug test devices" width={1400} height={867} sizes="(max-width: 900px) 90vw, 520px" /></div>
              <div className="bd">
                <h3 style={{ fontSize: "1.5rem" }}>Oral fluid</h3>
                <p>Detects recent use. Observed collection anywhere, no restroom needed, hard to tamper with.</p>
                <ul>
                  <li>Best for: post-accident, reasonable suspicion, on-site testing</li>
                  <li>Devices: ORF:31C OraFlo, OR:14A</li>
                </ul>
                <div className="btn-row">
                  <Link href="/oral-fluid-drug-testing" className="btn btn-primary">Explore oral fluid kits</Link>
                  <Link href="/get-a-quote" className="text-link">Get a quote</Link>
                </div>
              </div>
            </div>
            <div className="card spec-card">
              <div className="ph"><Image src="/kits/ua-series.webp" alt="Labb eTest Cup urine drug screens" width={900} height={900} sizes="(max-width: 900px) 90vw, 520px" /></div>
              <div className="bd">
                <h3 style={{ fontSize: "1.5rem" }}>Urine</h3>
                <p>Longer detection window and the widest choice of panels, from 6 to 23 drugs.</p>
                <ul>
                  <li>Best for: pre-employment, random programs</li>
                  <li>Devices: UA:06B, UA:13A, UA:16C, UA:23A and more</li>
                </ul>
                <div className="btn-row">
                  <Link href="/urine-drug-testing" className="btn btn-primary">Explore urine cups</Link>
                  <Link href="/get-a-quote" className="text-link">Get a quote</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section band-dark">
        <div className="wrap split">
          <div>
            <span className="status-pill">Early access</span>
            <h2>LabbHR: drug testing and background checks, finally in one place.</h2>
            <p>Order tests, see results the moment they are read, send non-negatives to the lab, and run background checks without switching systems.</p>
            <Checks items={["Rapid results from Labb Station, live", "Background checks built in", "One record per candidate, ready for audit"]} />
            <div className="btn-row">
              <Link href="/labbhr#access" className="btn btn-primary btn-lg">Request early access</Link>
              <Link href="/software" className="btn btn-ghost btn-lg">Compare software</Link>
            </div>
          </div>
          <div className="media-white">
            <Image src="/img/phone-app.webp" alt="LabbHR on a phone" width={1048} height={818} sizes="(max-width: 900px) 90vw, 520px" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div>
            <span className="eyebrow">True Privacy with Real Protection™</span>
            <h2>Respect for your people is built into the device.</h2>
            <p className="intro" style={{ marginBottom: 0 }}>
              Testing is personal. With Labb, no supervisor interprets a result by eye, and donor details are protected from collection to
              report. Your team gets a clear answer. Your employees get dignity.
            </p>
          </div>
          <div className="rails">
            <div><strong>Objective reads</strong><span>The reader decides, using the same criteria every time.</span></div>
            <div><strong>Protected records</strong><span>Results are stored electronically and shared only with the people who need them.</span></div>
            <div><strong>Errors caught early</strong><span>Guided workflows stop common collection mistakes before they happen.</span></div>
          </div>
        </div>
      </section>

      <section className="section soft" id="readers">
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <span className="eyebrow">Coming 2027</span>
              <h2 style={{ marginBottom: 6 }}>Two new readers are on the way.</h2>
              <p style={{ color: "var(--muted)", margin: 0 }}>Pilot programs are forming now. Ask about joining.</p>
            </div>
            <Link href="/contact" className="btn btn-outline">Ask about the pilot</Link>
          </div>
          <div className="grid g2" style={{ marginTop: 28 }}>
            <div className="card" style={{ background: "#fff", border: "1px solid var(--border)" }}>
              <span className="mini">Mobile app</span>
              <h3>LabbHR Reader</h3>
              <p>Rapid screen reading for urine, oral fluid and hair, from a phone.</p>
            </div>
            <div className="card" style={{ background: "#fff", border: "1px solid var(--border)" }}>
              <span className="mini">Desktop and handheld</span>
              <h3>LabbHR Pro Reader</h3>
              <p>Quantitative results on site for employer programs. Release pending final validation and pilot results.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Who we serve</span>
          <h2>Built for workplaces that can&apos;t slow down.</h2>
          <div className="serve" style={{ marginTop: 28 }}>
            <Link href="/industries/manufacturing"><h3>Manufacturing</h3><p>Test on the floor between shifts, without sending people off site.</p></Link>
            <Link href="/industries/logistics-warehousing"><h3>Logistics and fulfillment</h3><p>Clear high-volume hiring classes in minutes, at the warehouse.</p></Link>
            <Link href="/industries/construction"><h3>Construction</h3><p>Test at the job site after an incident, with a documented result.</p></Link>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap">
          <div>
            <h2>Ready to simplify your drug testing?</h2>
            <p>Talk to a Labb specialist. We will send a free sample and help you choose the right panels.</p>
          </div>
          <div className="btn-row" style={{ marginTop: 0 }}>
            <Link href="/get-a-quote?sample=1" className="btn btn-light">Request a free sample</Link>
            <a href={site.phoneHref} className="btn btn-ghost">Call {site.phone}</a>
          </div>
        </div>
      </section>
    </>
  );
}
