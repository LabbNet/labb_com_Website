import type { Metadata } from "next";
import { Breadcrumbs, Checks, Faq } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { QuickTestForm } from "@/components/QuickTestForm";

export const metadata: Metadata = {
  title: "Quick Test: Order an At-Home Drug Test, Proctored by Labb",
  description:
    "Order a drug test for yourself. Labb overnights the test to your home and a Labb proctor runs it with you by video, observed or non-observed, with the report sent to you.",
  alternates: { canonical: "/quick-test" },
};

// Structure first: content and SEO to be written in the page-by-page pass.
const steps = [
  { t: "Order", b: "Choose your test type, collection and reason, and tell us where to ship." },
  { t: "We overnight it", b: "Your test arrives at your home the next business day." },
  { t: "Test by video", b: "A Labb proctor walks you through the test on a video call, observed or non-observed." },
  { t: "Get your report", b: "Depending on the reason and the drugs tested, Labb sends the report to you, and to anyone you choose." },
];

const faqs = [
  { q: "What is the difference between observed and non-observed?", a: "In an observed test, a Labb proctor watches the collection by video. Non-observed tests are completed on your own, with the proctor guiding the steps." },
  { q: "Who receives the report?", a: "It depends on the reason for the test and the drugs tested. Labb confirms who can receive your report before your test ships." },
  { q: "How fast will I get my test?", a: "Labb ships overnight once your order is confirmed." },
  { q: "What does it cost?", a: "Price depends on the test you choose. A Labb specialist confirms the price with you before anything ships." },
];

export default function QuickTest() {
  return (
    <>
      <PageHero
        eyebrow="Quick Test · For individuals"
        title="A drug test at home, run by Labb."
        lede="Order a test for yourself. We overnight it to you, a Labb proctor runs it with you by video, and the report comes to you."
        primary={{ href: "#order", label: "Order a Quick Test" }}
        secondary={{ href: "#how", label: "How it works" }}
      />
      <Breadcrumbs items={[{ name: "Quick Test", href: "/quick-test" }]} />

      <section className="section" id="how">
        <div className="wrap">
          <span className="eyebrow">How it works</span>
          <h2>Four steps, from your door to your report</h2>
          <ol className="grid g4" style={{ listStyle: "none", padding: 0, marginTop: 28 }}>
            {steps.map((s, i) => (
              <li key={s.t} className="card rail">
                <div className="icon-dot" aria-hidden="true">{i + 1}</div>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap grid g2" style={{ alignItems: "start" }}>
          <div className="card top">
            <h3>Observed</h3>
            <Checks items={["A Labb proctor watches the collection by video", "For tests where the result must hold up for someone else"]} />
          </div>
          <div className="card top">
            <h3>Non-observed</h3>
            <Checks items={["You collect on your own with the proctor guiding the steps", "For personal peace of mind"]} />
          </div>
        </div>
      </section>

      <section className="section" id="order">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">Questions</span>
            <h2>Before you order</h2>
            <Faq items={faqs} />
          </div>
          <div className="hero-card">
            <QuickTestForm />
          </div>
        </div>
      </section>
    </>
  );
}
