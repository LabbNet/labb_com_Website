import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui";
import { CppApplication } from "@/components/CppApplication";
import { CppNav } from "@/components/CppNav";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Join the Labb Channel Partner Program: Get Started",
  description: "Apply to the Labb Channel Partner Program and see how the CPP agreement process works, from application to signing to onboarding.",
  alternates: { canonical: "/channel-partner-program/get-started" },
};

const contract = [
  { t: "Apply", b: "Submit the form. It tells us about your clinic, your services and who will sign." },
  { t: "Discovery call", b: "A Labb partner manager walks you through the program, costs and your questions." },
  { t: "Agreement sent", b: "Labb emails the Channel Partner Program Agreement for electronic signature. Review it with your advisors." },
  { t: "Sign", b: "Membership starts when both you and Labb sign." },
  { t: "Onboard", b: "You get your CPP member login, your Labb account set up, starter kits and a seat in member meetings." },
];

export default function CppGetStarted() {
  return (
    <>
      <PageHero
        eyebrow="Channel Partner Program · Get started"
        title="Apply to join the CPP."
        lede="Fill out the application and we'll take it from there. Applying doesn't commit you to anything."
      />
      <Breadcrumbs items={[{ name: "Partner program", href: "/channel-partner-program" }, { name: "Get started", href: "/channel-partner-program/get-started" }]} />
      <CppNav current="/channel-partner-program/get-started" />

      <section className="section" id="apply">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">The contract process</span>
            <h2>From application to signed agreement</h2>
            <ol className="contract-steps">
              {contract.map((c) => (
                <li key={c.t}><strong>{c.t}</strong><span>{c.b}</span></li>
              ))}
            </ol>
            <div className="banner-rule" style={{ marginTop: 24 }}>Membership starts only when both you and Labb sign the Channel Partner Program Agreement.</div>
            <p style={{ marginTop: 14 }}>Already a member? <Link href="/login?next=/members">Sign in</Link>.</p>
          </div>
          <div className="hero-card">
            <CppApplication />
          </div>
        </div>
      </section>
    </>
  );
}
