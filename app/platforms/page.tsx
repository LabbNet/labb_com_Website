import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Faq, CtaBand } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { LABBMD_LICENSE, LABBPO_LICENSE, platforms } from "@/lib/platforms";

export const metadata: Metadata = {
  title: "Labb Software Platforms: Labb Station, LabbHR and LabbPO",
  description:
    "Labb Station runs the test, LabbHR runs the business, LabbPO runs the caseload. Compare Labb's three drug testing software platforms and find the one built for you.",
  alternates: { canonical: "/platforms" },
};

const faqs = [
  { q: "Which platform is right for me?", a: "If you conduct tests, start with Labb Station. If you sell and deliver testing and want to grow, choose LabbHR. If you run a probation, parole or corrections department, choose LabbPO." },
  { q: "Do the platforms work together?", a: "Yes. LabbHR includes everything in Labb Station, and Labb Station results flow straight into LabbPO for corrections." },
  { q: "Can a collection site move from Labb Station to LabbHR?", a: "Yes. Start on Labb Station to test better, then move to LabbHR to grow. LabbHR keeps every Labb Station tool." },
];

export default function Platforms() {
  const list = [platforms.hr, platforms.po, platforms.md, platforms.station];
  return (
    <>
      <PageHero
        eyebrow="Labb software"
        title="Labb platforms. One for every part of drug testing."
        lede={<>Labb Station runs the test. LabbHR runs the business. LabbPO runs the caseload.</>}
        primary={{ href: "#platforms", label: "Pick your platform" }}
        secondary={{ href: "/compare", label: "Labb Station vs LabbHR" }}
      />
      <Breadcrumbs items={[{ name: "Platforms", href: "/platforms" }]} />

      <section className="section" id="platforms" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <div className="grid g4">
            {list.map((p) => (
              <div key={p.key} className={`card top platform-card${p.key === "po" || p.key === "md" ? ` ${p.key}` : ""}`}>
                <span className="rule">{p.rule}</span>
                <h2 style={{ fontSize: "1.7rem" }}>{p.name}</h2>
                <p style={{ fontWeight: 600, color: "var(--dark)" }}>{p.tagline}</p>
                <p style={{ marginTop: 10 }}>{p.summary}</p>
                <p style={{ marginTop: 12 }}><strong style={{ color: "var(--dark)" }}>Built for:</strong> {p.builtFor}</p>
                <p style={{ marginTop: 8 }}><span className={`tag${p.key === "po" || p.key === "md" ? ` ${p.key}` : ""}`}>{p.status}</span></p>
                <div className="btn-row">
                  <Link href={p.cta.href} className="btn btn-primary">{p.cta.label}</Link>
                  <Link href={p.href} className="btn btn-outline">About {p.name}</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">How they fit together</span>
            <h2>Start where you are, grow from there</h2>
            <p>
              A collection site starts on Labb Station to test better, then moves to LabbHR to grow. Every LabbHR user joins{" "}
              <Link href="/one">One by Labb</Link>, the ecosystem that connects the drug testing industry. Corrections departments run LabbPO,
              with Labb Station results flowing straight into each offender&apos;s record.
            </p>
            <div className="btn-row"><Link href="/compare" className="btn btn-outline-dark">Compare Labb Station and LabbHR</Link></div>
          </div>
          <div>
            <h2 style={{ fontSize: "1.3rem" }}>Questions</h2>
            <Faq items={faqs} />
          </div>
        </div>
      </section>

      <CtaBand />

      <div className="wrap"><p className="license-line">{LABBPO_LICENSE} {LABBMD_LICENSE}</p></div>
    </>
  );
}
