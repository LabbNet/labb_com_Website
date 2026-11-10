import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, Faq } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { publishedKits } from "@/lib/kits";
import { resources } from "@/lib/resources";
import { articles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Drug Testing Training, Handbooks and Certification",
  description:
    "Labb training for employers, clinics and collectors: free industry screening handbooks, the Clinic Owners Handbook, background screening guidebook, online certifications and kit data sheets.",
  alternates: { canonical: "/training" },
};

const memberBooks = [
  {
    t: "Clinic Owners Handbook",
    b: "The complete drug testing manual for clinic owners and operators: rapid test technology, lab testing, the MRO process, collections, package inserts, quality control, privacy, alcohol testing and drug classes. Updated every quarter.",
  },
  {
    t: "Background Screening Guidebook",
    b: "How background checks work and what the law requires before you offer them, focused on workplace screening. The companion to the Clinic Owners Handbook.",
  },
];

const faqs = [
  { q: "What format is Labb training?", a: "Labb training is written handbooks and guidebooks (PDF), each paired with an online certification exam. There are no videos to sit through, so your team can learn at its own pace." },
  { q: "How does certification work?", a: "Labb has three kinds of certification: product, software and position. Each is an online exam built on Labb training documents, takes a 90% score to pass, and is valid for one year. Collectors take product and software certifications; owners and managers take the position certification for their role or industry." },
  { q: "Who gets the Clinic Owners Handbook?", a: "The Clinic Owners Handbook and Background Screening Guidebook are included for Labb Channel Partner Program members, along with the Clinic Owner and Background Screening certifications." },
  { q: "Is this DOT training?", a: "No. Labb handbooks cover company (non-DOT) testing. DOT certification is being added as a benefit for Channel Partner Program members." },
];

export default function TrainingPage() {
  return (
    <>
      <PageHero
        eyebrow="Training and education"
        title={<>Run screening in-house, and know you&apos;re doing it right.</>}
        lede="Practical handbooks written for the people who run testing programs, each with an online certification so your team can prove what it knows."
        primary={{ href: "#handbooks", label: "Get a free handbook" }}
        secondary={{ href: "/certifications", label: "Certifications" }}
        image={{ src: "/img/clinic-owners-handbook.webp", alt: "Labb Clinic Owners Handbook", w: 1400, h: 1263 }}
      />
      <Breadcrumbs items={[{ name: "Training", href: "/training" }]} />

      <section className="section" id="handbooks">
        <div className="wrap">
          <span className="eyebrow">For employers · Free</span>
          <h2>Industry screening handbooks</h2>
          <p className="intro">For owners, HR teams, safety managers and supervisors who want to bring drug and background screening in-house.</p>
          <div className="grid g2">
            {resources.map((r) => (
              <Link key={r.slug} href={`/resources/${r.slug}`} className="card card-link top" style={{ flexDirection: "row", gap: 22, alignItems: "center" }}>
                <Image src={r.cover} alt="" width={r.coverW} height={r.coverH} style={{ width: 120, flex: "none" }} />
                <div>
                  <h3>{r.shortTitle}</h3>
                  <p>{r.facts.join(". ")}.</p>
                  <span className="more">Get the free handbook</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <span className="eyebrow">For clinics · CPP members</span>
          <h2>Clinic training library</h2>
          <p className="intro">Included for Labb Channel Partner Program members, with certification for each book.</p>
          <div className="grid g2">
            {memberBooks.map((m) => (
              <div key={m.t} className="card top">
                <h3>{m.t}</h3>
                <p>{m.b}</p>
              </div>
            ))}
          </div>
          <div className="btn-row">
            <Link href="/channel-partner-program" className="btn btn-primary">Join the Partner Program</Link>
            <Link href="/library" className="btn btn-outline">Member library sign in</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Certification</span>
            <h2>Product, software and position certifications</h2>
            <p className="intro" style={{ marginBottom: 20 }}>
              Three separate kinds of certification: product (how each test kit series works), software (Labb Station or LabbHR) and
              position (such as Clinic Owner or Construction Screening). Owners take their position certification; collectors take the
              product and software certifications.
            </p>
            <div className="stats" style={{ marginBottom: 24 }}>
              <div><strong>90%</strong><span>Score to pass</span></div>
              <div><strong>1 year</strong><span>Certification valid</span></div>
            </div>
            <Link href="/certifications" className="btn btn-primary">See Certifications</Link>
          </div>
          <Image src="/img/manufacturing-handbook.webp" alt="LabbHR Manufacturing Screening Handbook cover" width={935} height={1210} sizes="(max-width: 900px) 80vw, 380px" style={{ maxWidth: 360, margin: "0 auto" }} />
        </div>
      </section>

      <section className="section soft" id="data-sheets">
        <div className="wrap">
          <span className="eyebrow">Technical reference</span>
          <h2>Product data sheets</h2>
          <p className="intro">Panels, cutoffs, collection steps and accuracy data for each kit. The package insert in the box is the official performance document.</p>
          <div className="grid g4">
            {publishedKits.filter((k) => k.dataSheet).map((k) => (
              <div key={k.slug} className="card rail" style={{ padding: 18 }}>
                <h3 style={{ fontSize: "1rem" }}>{k.name}</h3>
                <p style={{ fontSize: "0.9rem" }}>
                  <a href={k.dataSheet} target="_blank" rel="noopener">Data sheet (PDF)</a> · <Link href={`/test-kits/${k.slug}`}>Kit page</Link>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Articles</span>
          <h2>Learn more</h2>
          <div className="grid g3" style={{ marginTop: 20 }}>
            {articles.slice(0, 3).map((a) => (
              <Link key={a.slug} href={`/news/${a.slug}`} className="card card-link rail">
                <h3 style={{ fontSize: "1.05rem" }}>{a.title}</h3>
                <span className="more">Read article</span>
              </Link>
            ))}
          </div>
          <div className="btn-row"><Link href="/news" className="btn btn-outline">All articles</Link></div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Questions</span>
          <h2>About Labb training</h2>
          <Faq items={faqs} />
        </div>
      </section>
      <CtaBand title="Training your whole team?" body="Ask about handbooks and certifications for every location, bundled with your testing program." />
    </>
  );
}
