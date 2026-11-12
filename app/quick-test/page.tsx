import type { Metadata } from "next";
import { Breadcrumbs, Faq } from "@/components/ui";
import { QuickTestForm } from "@/components/QuickTestForm";
import { GraphicSlot } from "@/components/visual/GraphicSlot";
import { RevealTiles } from "@/components/visual/Reveal";
import { quickTestCheckoutReady } from "@/lib/commerce";
import { QT_PRICING, money } from "@/lib/quickTest";

export const metadata: Metadata = {
  title: "Quick Test: Order a Drug Test at Home or at a Clinic | Labb",
  description:
    "Order a drug test online. Test at home with a Labb proctor by video, or at a clinic near you. Same price either way, with the report sent to you.",
  alternates: { canonical: "/quick-test" },
};

export const dynamic = "force-dynamic"; // checkout availability depends on runtime settings

const faqs = [
  { q: "Is the price the same at home and at a clinic?", a: "Yes. The price depends only on the drugs you test for, not where you test." },
  { q: "Can I choose which drugs to test for?", a: "Yes. Pick a standard or expanded panel, or build a custom panel drug by drug. The price updates as you add drugs." },
  { q: "What is the difference between observed and non-observed?", a: "At home, an observed test means a Labb proctor watches the collection by video. Non-observed tests are completed on your own, with the proctor guiding the steps." },
  { q: "Who receives the report?", a: "It depends on the reason for the test and the drugs tested. Labb confirms who can receive your report before your test is sent." },
  { q: "How fast will I get my test?", a: "At home, Labb ships your kit overnight. At a clinic, Labb sends the rapid test to the clinic and emails you where to go." },
];

export default async function QuickTest() {
  const ready = quickTestCheckoutReady();
  const from = money(QT_PRICING.baseCents);
  return (
    <>
      <section className="hero-v2">
        <div className="wrap">
          <div>
            <span className="eyebrow">Quick Test · For individuals</span>
            <h1>Order a drug test. At home or at a clinic.</h1>
            <p className="lede">From {from}, same price at home or at a clinic. Choose your drugs, results come to you.</p>
            <div className="btn-row">
              <a href="#order" className="btn btn-primary btn-lg">Order now</a>
              <a href="#options" className="btn btn-outline btn-lg">How it works</a>
            </div>
          </div>
          <GraphicSlot src="/graphics/quick-test/hero.webp" alt="A Labb test kit arriving at home beside a phone" label="Hero: kit at home with a phone" w={1600} h={1200} priority />
        </div>
      </section>
      <Breadcrumbs items={[{ name: "Quick Test", href: "/quick-test" }]} />

      <section className="band light" id="options">
        <div className="wrap">
          <div className="band-head">
            <h2>Two ways to test.</h2>
            <p className="lede-sm">Pick what works for you. Tap a plus for the steps.</p>
          </div>
          <RevealTiles
            cols={2}
            segment="individual"
            items={[
              {
                title: "At home",
                graphic: <GraphicSlot src="/graphics/quick-test/at-home.webp" alt="Testing at home on a video call" label="At home: video proctored test" w={1000} h={700} sizes="520px" />,
                body: "Order online. We overnight the kit to you. A Labb proctor runs the test with you by video, observed or non-observed. Your report comes to you.",
                topic: "Quick Test at home",
                cta: "Questions? Ask us",
              },
              {
                title: "At a clinic",
                graphic: <GraphicSlot src="/graphics/quick-test/at-clinic.webp" alt="Testing at a clinic" label="At a clinic: rapid test" w={1000} h={700} sizes="520px" />,
                body: "Order online. We send the rapid test to a clinic near you and email you where to go. The clinic collects and Labb reads the result. Your report comes to you.",
                topic: "Quick Test at a clinic",
                cta: "Questions? Ask us",
              },
            ]}
          />
        </div>
      </section>

      <section className="band" id="order">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <h2>Before you order</h2>
            <Faq items={faqs} />
          </div>
          <div className="hero-card">
            <QuickTestForm checkout={ready} />
          </div>
        </div>
      </section>
    </>
  );
}
