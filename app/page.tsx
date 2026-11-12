import Link from "next/link";
import type { Metadata } from "next";
import { GraphicSlot } from "@/components/visual/GraphicSlot";
import { Hotspots, RevealTiles } from "@/components/visual/Reveal";
import { ScanStory } from "@/components/visual/ScanStory";
import { KitShelf } from "@/components/visual/KitShelf";
import { shelfKits } from "@/lib/kits";

export const metadata: Metadata = {
  title: { absolute: "Smart Drug Testing Technology for Better Outcomes | Labb" },
  description:
    "Labb builds smarter drug testing technology: software, test kits and a connected network for labs, TPAs, collection sites, employers, treatment programs and corrections. Better technology, better outcomes.",
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
  { title: "Scan the ID", body: "The app reads the driver's license and fills in the paperwork.", g: "scan-1-id" },
  { title: "Collect and set it down", body: "Collect the sample and place the kit on a table.", g: "scan-2-place" },
  { title: "Capture the kit", body: "One photo in the app.", g: "scan-3-capture" },
  { title: "Get the result", body: "An objective read, saved with the image.", g: "scan-4-result" },
];

// Technology on the left, the outcome it produces on the right. Opening a tile shows how.
const outcomes = [
  { title: "Results you can stand behind", g: "outcome-defensible", body: "Every test is read objectively and documented with the image, so results hold up when they are questioned.", topic: "Outcome: defensible results" },
  { title: "Faster decisions", g: "outcome-faster", body: "Rapid results on site, and confirmation with one button when it is needed. Hire, treat or act the same day.", topic: "Outcome: faster decisions" },
  { title: "Fewer mistakes", g: "outcome-fewer-errors", body: "Guided steps, ID scanning and automatic paperwork remove the errors that come from manual forms.", topic: "Outcome: fewer mistakes" },
  { title: "Privacy protected", g: "outcome-privacy", body: "Masked drug names and digital records keep donor information private.", topic: "Outcome: privacy" },
  { title: "Programs that grow", g: "outcome-growth", body: "LabbHR gives testing businesses the tools to sell, contract and bill, and One by Labb connects them to the industry.", topic: "Outcome: growth" },
  { title: "Less work for your team", g: "outcome-less-work", body: "Fee collection, notifications and records run remotely, so staff manage more with less effort.", topic: "Outcome: less work" },
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
            <span className="eyebrow">Smart drug testing technology</span>
            <h1>Better technology. Better outcomes.</h1>
            <p className="lede">Software, test kits and a connected network that make every drug test faster, more accurate and easier to trust.</p>
            <div className="btn-row">
              <a href="#who" className="btn btn-primary btn-lg">Who are you?</a>
              <a href="#outcomes" className="btn btn-outline btn-lg">See the outcomes</a>
            </div>
          </div>
          <GraphicSlot src="/graphics/home/hero-technology.webp" alt="Labb software on a phone and tablet beside Labb test kits" label="Hero: Labb technology (phone, tablet and kits together)" w={1600} h={1200} priority />
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

      <section className="band" id="outcomes">
        <div className="wrap">
          <div className="band-head">
            <h2>Smarter technology. Better results.</h2>
            <p className="lede-sm">What changes when your testing runs on Labb.</p>
          </div>
          <RevealTiles
            cols={3}
            items={outcomes.map((o) => ({
              title: o.title,
              graphic: <GraphicSlot src={`/graphics/home/${o.g}.webp`} alt={o.title} label={o.title} w={800} h={600} sizes="320px" />,
              body: o.body,
              topic: o.topic,
            }))}
          />
        </div>
      </section>

      <section className="band dark">
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

      <section className="band">
        <div className="wrap">
          <div className="band-head">
            <h2>Technology in your pocket.</h2>
            <p className="lede-sm">With Labb Station, any phone runs the whole test.</p>
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
            <h2>Better outcomes start here.</h2>
            <p>Tell us how you test today. We&apos;ll show you what Labb changes.</p>
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
