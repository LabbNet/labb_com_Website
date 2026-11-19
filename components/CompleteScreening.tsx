"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Site-wide band: background checks, physicals and other services alongside drug testing.
// Hidden on account, admin, course, legal and utility pages.
const HIDE = /^\/(admin|members|learn|login|account|forgot-password|reset-password|unsubscribe|privacy|terms|thank-you|get-a-quote|contact|certifications\/purchased)(\/|$)/;

const SERVICES = [
  { t: "Background checks", b: "Criminal, employment and identity searches, run with the consent and notices the law requires." },
  { t: "Physicals", b: "Pre-employment and periodic physicals through clinics in the Labb network." },
  { t: "Drug and alcohol testing", b: "Rapid oral fluid and urine screens with lab confirmation and medical review." },
  { t: "Other screening services", b: "Ask about the rest of your onboarding and compliance checklist." },
];

export function CompleteScreening() {
  const path = usePathname() || "/";
  if (HIDE.test(path)) return null;
  return (
    <section className="complete-band" aria-labelledby="complete-title">
      <div className="wrap complete-grid">
        <div>
          <span className="eyebrow">Complete screening</span>
          <h2 id="complete-title">Drug testing, background checks, physicals and more.</h2>
          <p className="lede-sm">
            Labb offers background screening, physicals and other services in combination with drug testing for clients that need a
            complete solution. One partner and one program for every hire.
          </p>
          <div className="btn-row">
            <Link href="/get-a-quote" className="btn btn-primary">Build a complete program</Link>
          </div>
        </div>
        <ul className="complete-list">
          {SERVICES.map((s) => (
            <li key={s.t}><strong>{s.t}</strong><span>{s.b}</span></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
