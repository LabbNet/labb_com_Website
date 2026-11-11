import Link from "next/link";
import type { Metadata } from "next";
import { GraphicSlot } from "@/components/visual/GraphicSlot";
import { Hotspots, RevealTiles } from "@/components/visual/Reveal";
import { ScanStory } from "@/components/visual/ScanStory";
import { CompareSlider } from "@/components/visual/CompareSlider";
import { KitShelf } from "@/components/visual/KitShelf";
import { shelfKits } from "@/lib/kits";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Rapid Drug Testing Read Digitally by Labb Station | Labb" },
  description:
    "Labb Station reads every rapid drug test on a phone or tablet, documents the result and keeps donor information private. Software and test kits for labs, TPAs, collection sites, employers, treatment and corrections.",
  alternates: { canonical: "/" },
};

// Light copy, big graphics: each section is a headline, one line and a graphic. Detail sits behind plus buttons.
// Graphics marked as placeholders show the file name to drop into /public/graphics.
const who = [
  { href: "/laboratories", label: "Laboratories", g: "laboratories" },
  { href: "/tpas", label: "TPAs", g: "tpas" },
  { href: "/collection-sites", label: "Collection Sites", g: "collection-sites" },
  { href: "/employers", label: "Employers", g: "employers" },
  { href: "/treatment-recovery", label: "Treatment & Recovery", g: "treatment" },
  { href: "/corrections", label: "Corrections", g: "corrections" },
];

const story = [
  { title: "Place the test", body: "Collect the specimen and set the Labb kit down.", g: "scan-1-place" },
  { title: "Scan side 1", body: "Point any phone or tablet at the kit.", g: "scan-2-side1" },
  { title: "Scan side 2", body: "The app guides you to the next side.", g: "scan-3-side2" },
  { title: "Result on record", body: "An objective read, saved with the image.", g: "scan-4-result" },
];

const platforms = [
  { title: "One by Labb", g: "one", body: "The network that connects labs, TPAs, MROs, collection sites and employers.", href: "/one" },
  { title: "LabbHR", g: "labbhr", body: "Runs the business: sales, marketing, contracting and accounting for drug testing companies. Now in beta.", href: "/labbhr" },
  { title: "LabbPO", g: "labbpo", body: "Runs the caseload: random selection, notification and fee collection for corrections.", href: "/labbpo" },
  { title: "LabbMD", g: "labbmd", body: "The platform for treatment and recovery programs.", href: "/labbmd" },
  { title: "Labb Station", g: "labb-station", body: "Runs the test: an objective read and a documented record on any phone or tablet.", href: "/labb-station" },
];

export default function Home() {
  return (
    <>
      <section className="hero-v2">
        <div className="wrap">
          <div>
            <span className="eyebrow">Labb Station · {site.patent}</span>
            <h1>An objective read, controlled by software.</h1>
            <p className="lede">Every rapid drug test read on a phone, documented and private.</p>
            <div className="btn-row">
              <a href="#who" className="btn btn-primary btn-lg">Who are you?</a>
              <Link href="/get-a-quote" className="btn btn-outline btn-lg">Get a quote</Link>
            </div>
          </div>
          <GraphicSlot src="/graphics/home/hero-phone-scan.webp" alt="A phone scanning a Labb rapid drug test" label="Hero: phone scanning a Labb kit" w={1600} h={1200} priority />
        </div>
      </section>

      <section className="band light" id="who">
        <div className="wrap">
          <div className="band-head center">
            <h2>Who are you?</h2>
            <p className="lede-sm">Pick your world. We&apos;ll show you what fits.</p>
          </div>
          <div className="who-grid">
            {who.map((w) => (
              <Link key={w.href} href={w.href} className="who">
                <div style={{ width: 96 }}><GraphicSlot src={`/graphics/who/${w.g}.webp`} alt="" label={w.label} w={400} h={400} sizes="96px" /></div>
                <b>{w.label}</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <Hotspots
            graphic={<GraphicSlot src="/kits/or-06a/hero.webp" alt="eTest Swab OR:06A oral fluid test with its swab and cap" label="Kit render" w={1000} h={1000} />}
            title="Better-built test kits."
            intro="Designed to be read by a phone. Tap a plus to look closer."
            cta="Get a quote"
            points={[
              { x: 38, y: 34, title: "Built for the reader", body: "Each side is labeled and scanned in order, so the app reads every strip.", topic: "Kit design: built for the reader" },
              { x: 62, y: 58, title: "Observed oral fluid", body: "Collect anywhere in 2 to 3 minutes. No restroom needed.", topic: "Oral fluid collection" },
              { x: 22, y: 78, title: "Panels that fit", body: "From 6 to 23 drugs, oral fluid or urine, workplace or forensic.", topic: "Panel options" },
            ]}
          />
        </div>
      </section>

      <section className="band light">
        <div className="wrap">
          <div className="band-head">
            <h2>Scan it. Done.</h2>
            <p className="lede-sm">Labb Station turns a phone into a patented rapid test reader.</p>
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
            <h2>Read by eye, or read by Labb.</h2>
            <p className="lede-sm">Anyone reading by eye is exposed to bias. Labb Station reads only the device.</p>
            <div className="btn-row"><Link href="/labb-station" className="btn btn-light">See Labb Station</Link></div>
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
            <h2>One platform for every part of drug testing.</h2>
            <p className="lede-sm">Open any platform for the short version.</p>
          </div>
          <RevealTiles
            cols={3}
            items={platforms.map((p) => ({
              title: p.title,
              graphic: <GraphicSlot src={`/graphics/platforms/${p.g}.webp`} alt={`${p.title} logo`} label={`${p.title} logo`} w={800} h={500} sizes="320px" />,
              body: p.body,
              topic: p.title,
              href: p.href,
              hrefLabel: `About ${p.title}`,
            }))}
          />
        </div>
      </section>

      <section className="band light">
        <div className="wrap">
          <div className="band-head">
            <h2>The kits.</h2>
            <p className="lede-sm">Tap any kit for the panel and a quote.</p>
          </div>
          <KitShelf kits={shelfKits()} />
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap">
          <div>
            <h2>Ready when you are.</h2>
            <p>Tell us how you test today. We&apos;ll take it from there.</p>
          </div>
          <div className="btn-row" style={{ marginTop: 0 }}>
            <Link href="/get-a-quote" className="btn btn-light">Get a quote</Link>
            <Link href="/quick-test" className="btn btn-ghost">Need one test? Quick Test</Link>
          </div>
        </div>
      </section>
    </>
  );
}
