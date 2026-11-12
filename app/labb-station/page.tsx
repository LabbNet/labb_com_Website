import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Faq, JsonLd } from "@/components/ui";
import { GraphicSlot } from "@/components/visual/GraphicSlot";
import { RevealTiles } from "@/components/visual/Reveal";
import { ScanStory } from "@/components/visual/ScanStory";
import { CompareSlider } from "@/components/visual/CompareSlider";
import { KitShelf } from "@/components/visual/KitShelf";
import { ConnectButton } from "@/components/visual/ConnectDrawer";
import { shelfKits } from "@/lib/kits";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Labb Station: Digital Rapid Drug Test Reader App",
  description:
    "Labb Station turns a phone or tablet into a patented rapid drug test reader: an objective, documented result in minutes, with Flex Testing custom panels and one-button send to lab.",
  alternates: { canonical: "/labb-station" },
};

const story = [
  { title: "Scan the ID", body: "Scan the donor's driver's license. The app fills in the paperwork or finds the existing order.", g: "scan-1-id" },
  { title: "Collect and set it down", body: "Collect the sample and place the kit on a table or desk.", g: "scan-2-place" },
  { title: "Capture the kit", body: "Take one picture of the kit in the app.", g: "scan-3-capture" },
  { title: "Get the result", body: "An objective read, saved with the image and time.", g: "scan-4-result" },
  { title: "Send to lab", body: "Need confirmation? One button.", g: "scan-5-send" },
];

const features = [
  { title: "Objective read", g: "objective", body: "Every device is read against the same criteria for every donor, with the image on file." },
  { title: "True Privacy", g: "privacy", body: "Drug names are masked on OraFlo devices and decoded privately, so coworkers never see them." },
  { title: "Flex Testing", g: "flex", body: "Remove any drug from a 23 panel cup to build a custom panel. One cup covers about 8.4 million combinations." },
  { title: "Send to lab", g: "send-to-lab", body: "Confirmation is one button, with an electronic chain of custody for rapid and non-regulated lab tests." },
  { title: "Guided steps", g: "guided", body: "Every user tests the same way, step by step, which stops common mistakes." },
  { title: "Your own phone", g: "own-phone", body: "Read on the phones or tablets you already have. No analyzer to buy." },
];

const faqs = [
  { q: "What devices does Labb Station read?", a: "Labb Station reads Labb Urine eTest cups and Oral eTest and OraFlo oral fluid devices." },
  { q: "Do we need to buy hardware?", a: "No. Most teams read with the phones or tablets they already have. Devices used for results should be secured with a compliant mobile device management (MDM) system." },
  { q: "Who can get a Labb Station account?", a: "Accounts are open to professional drug testing facilities, clinics, occupational health providers and in-house programs running at least 25 tests a month." },
  { q: "How is Labb Station different from LabbHR?", a: "Labb Station runs the test. LabbHR runs the business: it includes everything in Labb Station and adds sales, marketing, contracting and accounting, background checks and access to One by Labb." },
];

export default function LabbStationPage() {
  return (
    <>
      <section className="hero-v2">
        <div className="wrap">
          <div>
            <span className="eyebrow">Labb Station · {site.patent}</span>
            <h1>Read every rapid test objectively.</h1>
            <p className="lede">A phone, an app and a patented reader. Every collection documented.</p>
            <div className="btn-row">
              <ConnectButton className="btn btn-primary btn-lg" topic="Labb Station demo" products={["Labb Station"]} label="Request a demo" title="Request a Labb Station demo" />
              <a href="#how" className="btn btn-outline btn-lg">See how it works</a>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, alignItems: "center", flexWrap: "wrap" }}>
              <Image src="/brand/app-store.png" alt="Labb Station on the App Store" width={941} height={309} style={{ height: 38, width: "auto" }} />
              <Image src="/brand/google-play.png" alt="Labb Station on Google Play" width={941} height={309} style={{ height: 38, width: "auto" }} />
            </div>
          </div>
          <GraphicSlot src="/graphics/station/hero-phone-beside-kits.webp" alt="A phone lying beside a Labb urine cup and oral fluid device" label="Hero: phone beside cup and oral fluid device" w={1600} h={1200} priority />
        </div>
      </section>
      <Breadcrumbs items={[{ name: "Platforms", href: "/platforms" }, { name: "Labb Station", href: "/labb-station" }]} />

      <section className="band light" id="how">
        <div className="wrap">
          <div className="band-head">
            <h2>How it works.</h2>
            <p className="lede-sm">Five steps on any phone or tablet.</p>
          </div>
          <ScanStory
            steps={story.map((s) => ({
              title: s.title,
              body: s.body,
              graphic: <GraphicSlot src={`/graphics/station/${s.g}.webp`} alt={s.title} label={`Phone: ${s.title.toLowerCase()}`} w={1200} h={1200} />,
            }))}
          />
        </div>
      </section>

      <section className="band dark">
        <div className="wrap split" style={{ alignItems: "center" }}>
          <div>
            <h2>Same test. Two very different reads.</h2>
            <p className="lede-sm">Anyone reading by eye is exposed to bias. Labb Station reads only the device.</p>
          </div>
          <CompareSlider
            leftLabel="By eye"
            rightLabel="Labb Station"
            left={<GraphicSlot src="/graphics/home/compare-by-eye.webp" alt="A rapid test read by eye with a faint line" label="Hand-held cup, faint line" w={1200} h={900} className="gslot-l" />}
            right={<GraphicSlot src="/graphics/home/compare-labb.webp" alt="A phone showing a documented Labb Station result" label="Phone with documented result" w={1200} h={900} className="gslot-r" />}
          />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="band-head">
            <h2>What you get.</h2>
            <p className="lede-sm">Tap a plus for the details.</p>
          </div>
          <RevealTiles
            cols={3}
            products={["Labb Station"]}
            items={features.map((f) => ({
              title: f.title,
              graphic: <GraphicSlot src={`/graphics/station/feature-${f.g}.webp`} alt={f.title} label={f.title} w={800} h={600} sizes="320px" />,
              body: f.body,
              topic: `Labb Station: ${f.title}`,
              cta: "Request a demo",
            }))}
          />
        </div>
      </section>

      <section className="band light">
        <div className="wrap">
          <div className="band-head">
            <h2>Reads every Labb kit.</h2>
            <p className="lede-sm">Tap a kit for the panel.</p>
          </div>
          <KitShelf kits={shelfKits()} />
        </div>
      </section>

      <section className="band">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <h2>Questions</h2>
          <Faq items={faqs} />
          <p style={{ marginTop: 24 }}><Link href="/compare">Compare Labb Station and LabbHR</Link></p>
        </div>
      </section>

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
