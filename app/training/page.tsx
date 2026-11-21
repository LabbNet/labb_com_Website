import Image from "next/image";
import Link from "next/link";
import { DrugProfileGrid } from "@/components/DrugProfileGrid";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, Faq } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { publishedKits } from "@/lib/kits";
import { resources } from "@/lib/resources";

// Clinic-facing books have free landing pages but are presented in the clinic library, not the employer list.
const CLINIC_BOOKS = ["clinic-owners-guidebook", "background-screening-guidebook"];
import { listArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Drug Testing Training, Guidebooks and Certification",
  description:
    "Labb training for employers, clinics and collectors: free industry screening guidebooks, the Clinic Owners Guidebook, background screening guidebook, online certifications and kit data sheets.",
  alternates: { canonical: "/training" },
};

const memberBooks = [
  {
    t: "Clinic Owners Guidebook",
    b: "The complete drug testing manual for clinic owners and operators: rapid test technology, lab testing, the MRO process, collections, package inserts, quality control, privacy, alcohol testing and drug classes. Updated every quarter.",
  },
  {
    t: "Background Screening Guidebook",
    b: "How background checks work and what the law requires before you offer them, focused on workplace screening. The companion to the Clinic Owners Guidebook.",
  },
];

const faqs = [
  { q: "What format is Labb training?", a: "Labb training is written guidebooks (PDF), each paired with an online certification exam. There are no videos to sit through, so your team can learn at its own pace." },
  { q: "How does certification work?", a: "Labb has separate paid certifications: product, specimen collection, software and position. Each is an online exam built on Labb training documents, takes about 85% on each chapter exam to pass, and is valid for one year. Collectors take product, specimen and software certifications; owners and managers take the position certification for their role or industry." },
  { q: "Who gets the Clinic Owners Guidebook?", a: "The Clinic Owners Guidebook and Background Screening Guidebook are available to Labb Channel Partner Program members. The Clinic Owner and Background Screening certifications are paid, like every Labb certification." },
  { q: "Is this DOT training?", a: "No. Labb guidebooks cover company (non-DOT) testing. DOT certification is being added as a benefit for Channel Partner Program members." },
];

export default async function TrainingPage() {
  const articles = await listArticles();
  return (
    <>
      <PageHero
        eyebrow="Training and education"
        title={<>Know your drug &amp; background screening program is run correctly with Labb Guidebooks.</>}
        lede="Practical guidebooks written for the people who run testing programs, each with an online certification so your team can prove what it knows."
        primary={{ href: "#guidebooks", label: "Get a free guidebook" }}
        secondary={{ href: "/certifications", label: "Certifications" }}
        image={{ src: "/img/clinic-owners-drug-testing-guidebook.webp", alt: "Labb Clinic Owners Guidebook", w: 913, h: 1000 }}
      />
      <Breadcrumbs items={[{ name: "Training", href: "/training" }]} />

      <section className="section" id="guidebooks">
        <div className="wrap">
          <span className="eyebrow">For employers · Free</span>
          <h2>Industry screening guidebooks</h2>
          <p className="intro">For owners, HR teams, safety managers and supervisors who want to bring drug and background screening in-house.</p>
          <div className="grid g2">
            {resources.filter((r) => !CLINIC_BOOKS.includes(r.slug)).map((r) => (
              <Link key={r.slug} href={`/resources/${r.slug}`} className="card card-link top" style={{ flexDirection: "row", gap: 22, alignItems: "center" }}>
                <Image src={r.cover} alt="" width={r.coverW} height={r.coverH} style={{ width: 120, flex: "none" }} />
                <div>
                  <h3>{r.shortTitle}</h3>
                  <p>{r.facts.join(". ")}.</p>
                  <span className="more">Get the free guidebook</span>
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
          <p className="intro">Available to Labb Channel Partner Program members. Each book has its own paid certification.</p>
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
            <Link href="/members" className="btn btn-outline">CPP member login</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div>
            <span className="eyebrow">Certification</span>
            <h2>Product, specimen, software and position certifications</h2>
            <p className="intro" style={{ marginBottom: 20 }}>
              Separate paid certifications: product (how each test kit series works), specimen collection (such as hair), software
              (Labb Station or LabbHR) and position (such as Clinic Owner or Construction Screening). Owners take their position
              certification; collectors take the product, specimen and software certifications.
            </p>
            <div className="stats" style={{ marginBottom: 24 }}>
              <div><strong>Paid</strong><span>Priced per certification</span></div>
              <div><strong>85%</strong><span>Score to pass each chapter</span></div>
              <div><strong>1 year</strong><span>Certification valid</span></div>
            </div>
            <Link href="/certifications" className="btn btn-primary">See Certifications</Link>
          </div>
          <Image src="/img/manufacturing-drug-testing-guidebook.webp" alt="LabbHR Employer's Guidebook, Manufacturing Edition, cover" width={913} height={1000} sizes="(max-width: 900px) 80vw, 380px" style={{ maxWidth: 360, margin: "0 auto" }} />
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

      <section className="section soft" id="drug-profiles">
        <div className="wrap">
          <span className="eyebrow">Drug Profile Series</span>
          <h2>One profile for every drug on a Labb test</h2>
          <p className="intro">
            What each drug is, how it affects people at work, how the Labb assay reads it, and a 1 to 10 Screening Priority Index to help you
            decide what belongs on your panel.
          </p>
          <DrugProfileGrid />
          <div className="btn-row"><Link href="/drugs" className="btn btn-outline-dark">See all drug profiles</Link></div>
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
      <CtaBand />
    </>
  );
}
