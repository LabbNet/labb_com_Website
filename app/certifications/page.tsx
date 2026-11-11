import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, Faq } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { certs, certTypes, paths, type CertType } from "@/lib/certifications";

export const metadata: Metadata = {
  title: "Labb Certifications: Product, Specimen, Software and Position",
  description:
    "Labb offers separate paid online certifications: product certifications for each test kit series, specimen collection certifications, software certifications for Labb Station and LabbHR, and position certifications such as Clinic Owner.",
  alternates: { canonical: "/certifications" },
};

const order: CertType[] = ["product", "specimen", "software", "position"];

const faqs = [
  { q: "Why are the certifications separate?", a: "Each one covers a different thing. A product certification proves someone knows how a specific device works. A software certification proves they can use Labb Station or LabbHR. A position certification covers drug testing knowledge for a role, such as clinic owner, regardless of product or software." },
  { q: "Which certifications do my collectors need?", a: "Collectors take a product certification for each product series they collect with, plus the software certification for the Labb software your site uses. The clinic owner certification is for the owner, not the collectors." },
  { q: "How do the exams work?", a: "Each certification is a paid online exam built on Labb's written training documents. You need 90% to pass, and the certification is valid for one year." },
  { q: "What are specimen collection certifications?", a: "They cover collecting a specific specimen type correctly, starting with hair for the new LabbHR readers coming in 2027. They are separate from product and software certifications." },
  { q: "Is any of this DOT training?", a: "No. Labb certifications cover company (non-DOT) testing. DOT certification is being added as a benefit for Channel Partner Program members." },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Labb certifications"
        title="The right certification for every role."
        lede="Separate online certifications for each product, specimen, software and position. Your team takes the ones that match its work. Certifications are paid; enrollment opens soon."
        aside={
          <div className="hero-card" style={{ color: "var(--dark)" }}>
            <LeadForm variant="certification-waitlist" title="Join the waitlist" subtitle="Be first to know when enrollment opens." submitLabel="Join the Waitlist" />
          </div>
        }
      />
      <Breadcrumbs items={[{ name: "Training", href: "/training" }, { name: "Certifications", href: "/certifications" }]} />

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <span className="eyebrow">Four types</span>
          <h2>Separate certifications for separate skills</h2>
          <div className="grid g4" style={{ marginTop: 28 }}>
            {order.map((t, i) => (
              <a key={t} href={`#${t}`} className="card card-link top">
                <div className="icon-dot" aria-hidden="true">{i + 1}</div>
                <h3>{certTypes[t].title}</h3>
                <p>{certTypes[t].summary}</p>
                <span className="more-row">See {certTypes[t].label.toLowerCase()} certifications →</span>
              </a>
            ))}
          </div>
          <div className="stats" style={{ marginTop: 28 }}>
            <div><strong>Paid</strong><span>Priced per certification</span></div>
            <div><strong>Online</strong><span>Exam built on Labb training documents</span></div>
            <div><strong>90%</strong><span>Score to pass</span></div>
            <div><strong>1 year</strong><span>Certification valid</span></div>
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <span className="eyebrow">Who takes what</span>
          <h2>Find your certifications by role</h2>
          <p className="intro">For example: a clinic owner takes the Clinic Owner certification. That clinic&apos;s collectors take the product, specimen and software certifications. They are separate.</p>
          <div className="compare-wrap">
            <table className="compare paths">
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left" }}>Your role</th>
                  <th scope="col">Position</th>
                  <th scope="col">Product</th>
                  <th scope="col">Software</th>
                </tr>
              </thead>
              <tbody>
                {paths.map((p) => (
                  <tr key={p.role}>
                    <th scope="row">{p.role}</th>
                    {[p.position, p.product, p.software].map((v, i) => (
                      <td key={i} className={v === "Not required" ? "" : "on"}>{v === "Not required" ? <span className="no">Not required</span> : v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {order.map((t, idx) => (
        <section key={t} id={t} className={`section${idx % 2 ? " soft" : ""}`} style={{ scrollMarginTop: 110 }}>
          <div className="wrap">
            <span className="eyebrow">{certTypes[t].label} certifications</span>
            <h2>{certTypes[t].title}</h2>
            <p className="intro">{certTypes[t].summary}</p>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))" }}>
              {certs.filter((c) => c.type === t).map((c) => (
                <div key={c.sku} className="card top" style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "4px solid var(--orange)" }}>
                  <span className="mini">{certTypes[t].label}{c.status ? ` · ${c.status}` : ""}</span>
                  <h3>{c.name}</h3>
                  <p>{c.covers}</p>
                  <p style={{ marginTop: 12, fontSize: "0.88rem" }}><strong style={{ color: "var(--dark)" }}>For:</strong> {c.forWho}</p>
                </div>
              ))}
            </div>
            {t === "product" && <p style={{ marginTop: 20 }}><Link href="/test-kits" className="text-link" style={{ textDecoration: "underline" }}>See the products →</Link></p>}
            {t === "specimen" && <p style={{ marginTop: 20 }}><Link href="/#readers" className="text-link" style={{ textDecoration: "underline" }}>About the 2027 readers →</Link></p>}
            {t === "software" && <p style={{ marginTop: 20 }}><Link href="/compare" className="text-link" style={{ textDecoration: "underline" }}>Compare Labb Station and LabbHR →</Link></p>}
            {t === "position" && <p style={{ marginTop: 20 }}><Link href="/training" className="text-link" style={{ textDecoration: "underline" }}>See the handbooks behind these certifications →</Link></p>}
          </div>
        </section>
      ))}

      <section className="section">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Questions</span>
          <h2>About Labb certifications</h2>
          <Faq items={faqs} />
        </div>
      </section>
      <CtaBand title="Certifying a whole team?" body="Ask about certification for every collector and location, bundled with your testing program." />
    </>
  );
}
