import { CtaBand } from "@/components/ui";
import Link from "next/link";
import type { Metadata } from "next";
import { GraphicSlot } from "@/components/visual/GraphicSlot";
import { Hotspots } from "@/components/visual/Reveal";
import { IconSoftware, IconReader, IconBackground, IconPhysicals, IconCollections, IconAdministration } from "@/components/ServiceIcons";
import { ScanStory } from "@/components/visual/ScanStory";
import { KitShelf } from "@/components/visual/KitShelf";
import { shelfKits } from "@/lib/kits";

export const metadata: Metadata = {
  title: { absolute: "Drug Testing Programs, Technology and Support | Labb" },
  description:
    "Labb builds smarter drug testing technology: software, test kits and a connected network for labs, TPAs, collection sites, employers, treatment programs and corrections. Better technology, better outcomes.",
  alternates: { canonical: "/" },
};

// Light copy, big graphics: each section is a headline, one line and a graphic. Detail sits behind plus buttons.
// Graphics marked as placeholders show the file name to drop into /public/graphics.

const story = [
  { title: "Labb Mobile App", body: "The app walks your employees step-by-step through each test.", src: "/graphics/home/benefits-phones.webp", w: 1600, h: 1200, alt: "Three phone screens from the Labb mobile app: selecting an organization, choosing a UA:13A test kit, and the donor signature step" },
  { title: "Mobile App Scanner", body: "The app scans rapid test kits and provides a fast, unbiased result. Use Labb-offered devices or any iPhone or Android device with internet access.", src: "/graphics/home/benefits-scanner.webp", w: 1600, h: 1200, alt: "A hand holding a phone running the Labb app, scanning the test lines on a UA:06B eTest Cup" },
  { title: "Electronic Confirmation", body: "If the rapid test is non-negative, just package the sample for confirmation. There are no paper forms to fill out. Just pack and ship.", src: "/graphics/home/benefits-confirmation.webp", w: 1600, h: 1200, alt: "The Labb app shipment screen on a phone and a tablet, with Add Label and Pack Specimens for a shipment to the lab" },
  { title: "Complete Program Support", body: "A Labb team member or partner will onboard and train your team. You will always get a single point of contact for all live training and support.", src: "/graphics/home/outcome-growth.webp", w: 800, h: 600, alt: "Stacked blocks labeled background screens, physicals, drug testing, collections and emergency support" },
];

// Technology on the left, the outcome it produces on the right. Opening a tile shows how.
const outcomes = [
  { title: "Stand-Alone or Integrated Software", Icon: IconSoftware, g: "outcome-defensible", alt: "A Labb drug test result form showing a negative result with donor and specimen details", body: "End-to-end employment screening now has more options. Labb offers a variety of stand-alone as well as fully integrated solutions designed to run entire employment screening departments or integrate into current tech stacks.", topic: "Intelligent software", href: "/labbhr", hrefLabel: "See LabbHR" },
  { title: "Mobile App Reader", Icon: IconReader, g: "outcome-fewer-errors", alt: "A Labb testing station with a tablet and a UA:16C eTest Cup showing test and control lines", body: "Turn any phone or tablet into a digital rapid testing reader. Get objective, automated rapid test screening results with digital chain of custody and electronic lab confirmation and MRO ordering.", topic: "Rapid test reader", href: "/labb-station", hrefLabel: "See Labb Station" },
  { title: "Background Screening", Icon: IconBackground, g: "outcome-background", body: "Consolidate and order background screening with drug and alcohol tests, physicals and more.", topic: "Background checks" },
  { title: "Physicals", Icon: IconPhysicals, g: "outcome-physicals", alt: "A tablet showing a donor intake form beside a stethoscope", body: "Pre-employment and periodic physicals through Labb's network of clinics, scheduled and tracked in the same program as your drug testing.", topic: "Physicals" },
  { title: "Professional Collections", Icon: IconCollections, g: "outcome-privacy", alt: "Close-up of an OraFlo oral fluid device with masked drug labels and the collector above the test strips", body: "Trained collectors at clinics and collection sites near your locations, or your own staff trained by Labb to collect in-house. Urine and observed oral fluid, including OraFlo panels with masked drug names that keep each donor's screen private.", topic: "Professional collections", href: "/test-kits/oraflo", hrefLabel: "See OraFlo" },
  { title: "Complete Program Administration", Icon: IconAdministration, g: "outcome-growth", alt: "Stacked blocks labeled background screens, physicals, drug testing, collections and emergency support", body: "Labb is an end-to-end screening partner for employers. Background screens, physicals, drug testing, collections and emergency support, set up and managed in one program with one team behind it. Start with what you need and add services as you grow.", topic: "Program administration", href: "/employers", hrefLabel: "Screening for employers" },
];


export default function Home() {
  return (
    <>
      <section className="hero-v2">
        <div className="wrap">
          <div>
            <span className="eyebrow">Smart drug testing technology</span>
            <h1>Better drug testing starts here.</h1>
            <p className="lede">Your testing goals, our technology and support. In your office, at a clinic, or across your whole business.</p>
            <div className="btn-row">
              <a href="#who" className="btn btn-primary btn-lg">Who are you?</a>
              <a href="#services" className="btn btn-outline btn-lg">See services</a>
            </div>
          </div>
          <GraphicSlot src="/graphics/home/hero-technology.webp" alt="Labb Urine eTest cups UA:06B, UA:13A, UA:23A and UA:18C with the Oral eTest OR:06A oral fluid test" label="Hero: Labb test kit family" w={1565} h={758} priority />
        </div>
      </section>

      <section className="band light" id="who">
        <div className="wrap">
          <div className="band-head center">
            <h2>Who are you?</h2>
            <p className="lede-sm">Two paths. Pick yours.</p>
          </div>
          <div className="paths">
            <Link href="/employers" className="split-door">
              <GraphicSlot src="/graphics/who/employers.webp" alt="A hard hat beside a clipboard with an employment application" label="Employers" w={1000} h={600} sizes="520px" />
              <span className="eyebrow">Employers</span>
              <h3>I am an Employer</h3>
              <p>I need to test my employees, at my location or at a clinic.</p>
              <div className="chips-row"><span>Test in-house</span><span>Use a clinic</span></div>
              <span className="go">For employers →</span>
            </Link>
            <Link href="/testing-professionals" className="split-door">
              <GraphicSlot src="/graphics/who/testing-pros.webp" alt="A tablet showing a donor intake form beside a stethoscope" label="Industry professionals" w={1000} h={600} sizes="520px" />
              <span className="eyebrow">Industry professionals</span>
              <h3>I am an Industry Professional</h3>
              <p>I run a clinic, collection site, TPA or laboratory.</p>
              <div className="chips-row"><span>Clinics</span><span>TPAs</span><span>Labs</span></div>
              <span className="go">For industry professionals →</span>
            </Link>
          </div>
          <Link href="/quick-test" className="qt-strip">
            <span className="qt-strip-text">
              <strong>Need a drug test for yourself?</strong>
              <span>Order a Quick Test. Test at home or at a clinic for the same price, pick your drugs and check out in minutes.</span>
            </span>
            <span className="btn btn-primary">Order a Quick Test</span>
          </Link>
        </div>
      </section>

      <section className="band" id="services">
        <div className="wrap">
          <div className="band-head">
            <h2>Intelligent solutions for complete employment screening options.</h2>
            <p className="lede-sm">What changes when your testing runs on Labb.</p>
          </div>
          <div className="svc-grid">
            {outcomes.map((o) => (
              <div key={o.title} className="svc">
                <div className="svc-icon"><o.Icon /></div>
                <h3>{o.title}</h3>
                <p>{o.body}</p>
                {"href" in o && o.href && (
                  <Link href={o.href} className="svc-link">{o.hrefLabel} →</Link>
                )}
              </div>
            ))}
          </div>
          <Link href="/channel-partner-program" className="qt-strip">
            <span className="qt-strip-text">
              <strong>Run a clinic or collection site?</strong>
              <span>Join the Labb Channel Partner Program and offer these same solutions to employers in your area.</span>
            </span>
            <span className="btn btn-primary">Become a partner</span>
          </Link>
        </div>
      </section>


      <section className="band light">
        <div className="wrap">
          <Hotspots
            graphic={<GraphicSlot src="/graphics/home/oraflo-31c.webp" alt="OraFlo ORF:31C oral fluid device with masked drug labels, its cap and the oral fluid collector" label="OraFlo 31C" w={1640} h={770} />}
            title={"Built for today’s workforce."}
            intro="OraFlo oral fluid screens, built for the workplace. Tap a plus to look closer."
            cta="Get a quote"
            points={[
              { x: 17, y: 31, title: "True privacy", body: "Drug names are masked on the device by code. The donor never sees what is being tested, and Labb Station decodes the panel privately.", topic: "OraFlo: true privacy" },
              { x: 88, y: 44, title: "Lower sample volume", body: "OraFlo needs less oral fluid than typical collection devices, so collection is quicker and easier, even for donors with a dry mouth.", topic: "OraFlo: lower sample volume" },
              { x: 35, y: 47, title: "Workplace-aligned THC detection", body: "Screens for parent THC at 40 ng/mL, which points to recent use rather than use from weeks ago. That fits impairment-focused workplace policies.", topic: "OraFlo: THC detection" },
              { x: 47, y: 62, title: "Digitally read", body: "Every OraFlo is read by Labb Station on a phone or tablet. Results are objective, consistent and saved with the image.", topic: "OraFlo: digitally read" },
            ]}
          />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="band-head">
            <h2>Benefits of in-house testing.</h2>
          </div>
          <ScanStory
            steps={story.map((s) => ({
              title: s.title,
              body: s.body,
              graphic: <GraphicSlot src={s.src} alt={s.alt} label={s.title} w={s.w} h={s.h} sizes="(max-width: 900px) 100vw, 50vw" />,
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

      <CtaBand
        title="Better technology. Better outcomes."
        body="Tell us your testing goals and our support team builds a program around them, then keeps it on track."
        secondary={{ href: "/quick-test", label: "Need one test? Quick Test" }}
      />
    </>
  );
}
