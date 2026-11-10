import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, CtaBand, Faq, JsonLd } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Labb Station: Digital Rapid Drug Test Reader App",
  description:
    "Labb Station reads rapid drug tests on a phone or tablet, documents every result automatically and keeps donor information private. Available on the App Store and Google Play.",
  alternates: { canonical: "/labb-station" },
};

const features = [
  { t: "Objective digital read", b: "Every device is read against the same criteria, so every person gets the same fair read." },
  { t: "Runs on your phone or tablet", b: "No special hardware. Download the app and read devices wherever you collect." },
  { t: "Patented True Privacy", b: "OraFlo devices show codes, not drug names, and Labb Station decodes them. Supervisors don't read or judge the result." },
  { t: "Documented automatically", b: "Each result is time-stamped and stored against the donor record, ready for audits." },
  { t: "Paperless confirmations", b: "Scannable decal sets link a non-negative screen to its lab confirmation without handwriting or typing." },
  { t: "Guided workflows", b: "Step-by-step collection prompts catch common errors before they become a bad result." },
];

const faqs = [
  { q: "What devices does Labb Station read?", a: "Labb Station reads Labb UA Series urine cups and OR Series and ORF Series (OraFlo) oral fluid devices. See the full list on the test kits page." },
  { q: "Do we need to buy hardware?", a: "No. Most teams read with the phones or tablets they already have. Devices used for results should be secured with a compliant mobile device management (MDM) system." },
  { q: "Who can get a Labb Station account?", a: "Accounts are open to professional drug testing facilities, clinics, occupational health providers and in-house programs running at least 25 tests a month." },
  { q: "How is Labb Station different from LabbHR?", a: "Labb Station is the rapid test reader. LabbHR includes everything in Labb Station and adds lab testing, confirmations, MRO results and background checks in one record per candidate." },
];

export default function LabbStationPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Software", href: "/software" }, { name: "Labb Station", href: "/labb-station" }]} />
      <section className="hero">
        <div className="wrap">
          <div>
            <span className="eyebrow">Labb Station reader</span>
            <h1>
              Rapid drug testing, read <span className="em">digitally</span> and documented automatically.
            </h1>
            <p className="lede">
              Labb Station turns a phone or tablet into a rapid drug test reader. Collect, capture and get a documented result in minutes,
              with the same objective read for every person.
            </p>
            <div className="btn-row">
              <Link href="/get-a-quote" className="btn btn-primary">Request a Demo</Link>
              <Link href="/software" className="btn btn-outline">Compare with LabbHR</Link>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <Image src="/brand/app-store.png" alt="Download Labb Station on the App Store" width={941} height={309} style={{ height: 44, width: "auto" }} />
              <Image src="/brand/google-play.png" alt="Get Labb Station on Google Play" width={941} height={309} style={{ height: 44, width: "auto" }} />
            </div>
          </div>
          <Image src="/img/phone-app.webp" alt="Labb Station app on a phone showing a rapid drug test result" width={1048} height={818} priority sizes="(max-width: 900px) 92vw, 540px" />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">What it does</span>
          <h2>Everything a rapid testing program needs</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {features.map((f, i) => (
              <div key={f.t} className="card top">
                <div className="icon-dot" aria-hidden="true">{i + 1}</div>
                <h3>{f.t}</h3>
                <p>{f.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap split reverse">
          <div>
            <span className="eyebrow">True Privacy with Real Protection™</span>
            <h2>Protect employee privacy and dignity</h2>
            <p className="intro">
              On OraFlo devices, strips are labeled with codes instead of drug names. A donor standing next to the collector can&apos;t
              tell which drug a line belongs to, and legal prescriptions aren&apos;t exposed to coworkers. Labb Station decodes the
              result privately.
            </p>
            <Checks items={["Drug names masked on the device", "Results decoded by the reader, not read aloud", "Legal prescriptions kept private"]} />
          </div>
          <Image src="/img/oraflo-masked-names.webp" alt="OraFlo oral fluid device with masked drug codes" width={1048} height={818} sizes="(max-width: 900px) 92vw, 560px" />
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div>
            <span className="eyebrow">How it works</span>
            <h2>Four steps, a few minutes</h2>
            <ol className="grid" style={{ listStyle: "none", padding: 0, gap: 14 }}>
              {[
                ["Collect", "Collect oral fluid or urine with a Labb device, following the guided steps in the app."],
                ["Capture", "Scan the device with Labb Station at the read time."],
                ["Result", "The result is read digitally, time-stamped and saved to the donor record."],
                ["Confirm", "Send any non-negative to the lab for confirmation with a scannable decal, no paper forms."],
              ].map(([t, b], i) => (
                <li key={t} className="card rail" style={{ padding: 18 }}>
                  <h3 style={{ fontSize: "1.05rem", marginBottom: 4 }}>{i + 1}. {t}</h3>
                  <p>{b}</p>
                </li>
              ))}
            </ol>
          </div>
          <Image src="/img/paperless-confirmation.webp" alt="Scannable decal set for paperless lab confirmation" width={1400} height={1400} sizes="(max-width: 900px) 92vw, 520px" />
        </div>
      </section>

      <section className="section soft">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Questions</span>
          <h2>About Labb Station</h2>
          <Faq items={faqs} />
          <p className="fine" style={{ textAlign: "left", marginTop: 24 }}>Labb Station is covered by {site.patent}.</p>
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
