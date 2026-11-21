"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Site-wide band: background checks, physicals and other services alongside drug testing.
// Hidden on account, admin, course, legal and utility pages.
const HIDE = /^\/(admin|members|learn|login|account|forgot-password|reset-password|unsubscribe|privacy|terms|thank-you|get-a-quote|contact|certifications\/purchased|contract)(\/|$)/;

const SERVICES = [
  { t: "Background checks", b: "Criminal, employment and identity searches, run with the consent and notices the law requires.", href: "/background-checks" },
  { t: "Physicals", b: "Pre-employment and periodic physicals through clinics in the Labb network." },
  { t: "Rapid and lab-based testing", b: "Rapid oral fluid and urine screens and lab-based testing, for regulated (DOT) and non-regulated programs." },
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
            Labb offers rapid and lab-based drug testing for regulated and non-regulated industries, plus background screening, physicals
            and other services for clients that need a complete solution. One partner and one program for every hire.
          </p>
          <div className="btn-row">
            <Link href="/get-a-quote" className="btn btn-primary">Build a complete program</Link>
          </div>
        </div>
        <ul className="complete-list">
          {SERVICES.map((s) => (
            <li key={s.t}><strong>{"href" in s && s.href ? <Link href={s.href}>{s.t}</Link> : s.t}</strong><span>{s.b}</span>{"href" in s && s.href && <Link href={s.href} className="complete-more">See all background checks <span aria-hidden="true">&rarr;</span></Link>}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
