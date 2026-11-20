import type { Metadata } from "next";
import { SegmentPage } from "@/components/SegmentPage";
import { GraphicSlot } from "@/components/visual/GraphicSlot";

export const metadata: Metadata = {
  title: "In-House Drug Testing for Employers: Test at Your Location",
  description:
    "Run rapid oral fluid and urine drug tests at your own location with Labb Station on a phone: guided collection, an objective digital read, one-button lab confirmation and documented results.",
  alternates: { canonical: "/employers/in-house" },
};

export default function InHouse() {
  return (
    <SegmentPage
      slug="employers/in-house"
      crumb="Test in-house"
      eyebrow="Employers: test in-house"
      title={<>Test at your location.<br />Results in minutes.</>}
      lede="Your team collects and runs rapid oral fluid or urine tests on site with Labb Station on a phone. Guided steps, an objective digital read and one-button lab confirmation, so you can hire the same day."
      primary={{ href: "#contact", label: "Plan in-house testing" }}
      secondary={{ href: "#how", label: "How it works" }}
      problem={{
        eyebrow: "Why test in-house",
        title: "Every trip to a collection site costs you hours and candidates.",
        body: (
          <p>
            Sending people off site means scheduling, travel and waiting for results, and good candidates take other offers while they
            wait. Testing where your people already are puts the result in your hands in minutes, on your schedule.
          </p>
        ),
      }}
      pains={[
        "Candidates lost while waiting days for results",
        "Hours of paid time spent driving to collection sites",
        "Post-accident tests delayed past the window",
        "Kits read by eye, with no record of what was seen",
      ]}
      extra={{
        eyebrow: "On the job site, in the office",
        title: "Testing that fits where your people work",
        wide: true,
        body: (
          <div className="feature-split">
            <GraphicSlot src="/graphics/employers/in-house-workplace-drug-testing-job-site.webp" alt="A construction supervisor capturing an OraFlo oral fluid test with a phone on the job site" label="In-house testing" w={1000} h={700} sizes="(max-width: 860px) 100vw, 560px" className="photo" />
            <div>
              <p className="lede-sm">
                Oral fluid tests are collected under direct observation and need no restroom, so you can test in an office, a trailer or a
                break room. Labb Station walks your collector through every step and captures the device with the phone camera for an
                objective read.
              </p>
              <ul className="checks">
                <li>Any iPhone or Android phone with internet, or a Labb device</li>
                <li>Pre-employment, random, post-accident and reasonable suspicion</li>
                <li>Results documented electronically for every test</li>
                <li>Masked drug names on OraFlo protect donor privacy</li>
              </ul>
            </div>
          </div>
        ),
      }}
      answer={{
        eyebrow: "How it works",
        title: "From kit to confirmed result, step by step",
        cards: [
          { t: "Choose your panels", b: "Labb recommends oral fluid or urine panels for your roles, testing reasons and state rules, and sends a free sample." },
          { t: "Get your collectors certified", b: "Your staff complete Labb training documents and online certification before they collect." },
          { t: "Collect with guided steps", b: "Labb Station walks the collector through identity, collection and timing so nothing is skipped." },
          { t: "Capture for an objective read", b: "The phone camera captures the device, and the result is read digitally rather than judged by eye." },
          { t: "Confirm with one button", b: "Non-negative screens go to the lab for confirmation and medical review without extra paperwork." },
          { t: "Keep every record", b: "Each test is documented electronically, so results and chain of custody are easy to find and defend." },
        ],
        link: { href: "/labb-station", label: "See how Labb Station works" },
      }}
      kits={{
        title: "Workplace kits for in-house testing",
        intro: "Oral fluid for observed collection anywhere, urine where you have a restroom. Employment use only (EUO) and FDA/OTC kits.",
        slugs: ["orf-31c-oraflo", "or-06a-etest-swab", "or-12a-etest-swab", "or-14a-etest-swab", "ua-06b-svt", "ua-13a-svt", "ua-15a", "ua-16c-svt"],
      }}
      faqs={[
        { q: "Who on my team can collect?", a: "Any employee you choose, once they complete Labb's training documents and online certification. Most employers train two or more people per site so testing never waits on one person." },
        { q: "Do we still need a lab?", a: "Only for non-negative screens. Those are sent for lab confirmation and medical review with one button, and Labb handles the connection." },
        { q: "How long does a test take?", a: "Oral fluid collection takes a few minutes, and kits are ready to read within about 10 minutes." },
        { q: "Can we mix in-house testing and clinics?", a: "Yes. Many employers test in-house at their main sites and use clinics for remote locations or after hours. It stays one program." },
        { q: "What about DOT-regulated employees?", a: "Labb rapid kits are for company (non-DOT) testing. Labb also offers lab-based testing, so regulated (DOT) and non-regulated employees can run through one program." },
      ]}
      form={{
        segment: "employer",
        products: ["Labb Station", "Test kits"],
        heading: "Get a quote",
        title: "Plan in-house testing",
        intro: "Tell us about your sites and workforce and we'll recommend panels, send a free sample and get your collectors certified.",
        submit: "Request a consultation",
        variant: "quote",
        note: "Your testing goals, our technology and support: Labb builds the program around your goals, adds background screening and physicals when you need them, and keeps it on track.",
      }}
    />
  );
}
