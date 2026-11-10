import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, CtaBand, Faq, KitCard } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { getIndustry, industries } from "@/lib/industries";
import { publishedKits } from "@/lib/kits";
import { getResource } from "@/lib/resources";

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const i = getIndustry((await params).slug);
  if (!i) return {};
  return { title: i.metaTitle, description: i.metaDescription, alternates: { canonical: `/industries/${i.slug}` } };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const ind = getIndustry((await params).slug);
  if (!ind) notFound();
  const kits = ind.kitSlugs.map((s) => publishedKits.find((k) => k.slug === s)).filter((k) => !!k);
  const handbook = ind.handbook ? getResource(ind.handbook) : undefined;

  return (
    <>
      <Breadcrumbs items={[{ name: `${ind.name} drug testing`, href: `/industries/${ind.slug}` }]} />
      <section className="hero form-hero">
        <div className="wrap">
          <div>
            <span className="eyebrow">{ind.eyebrow}</span>
            <h1>{ind.h1}</h1>
            <p className="lede">{ind.lede}</p>
            <Checks items={ind.facts} />
          </div>
          <div className="hero-card" id="quote">
            <LeadForm variant="quote" industry={ind.name} title="Get a quote or a free sample" subtitle="Fill out the form and a Labb specialist will reply shortly." />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Why test on site</span>
          <h2>Built for {ind.name.toLowerCase()}</h2>
          <div className="grid g4" style={{ marginTop: 28 }}>
            {ind.reasons.map((r) => (
              <div key={r.title} className="card top">
                <h3>{r.title}</h3>
                <p>{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <span className="eyebrow">Popular kits for {ind.name.toLowerCase()}</span>
          <h2>Panels {ind.name.toLowerCase()} teams use most</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {kits.map((k) => <KitCard key={k.slug} kit={k} />)}
          </div>
          <div className="note" style={{ marginTop: 28 }}>
            <strong style={{ flex: "none" }}>Note</strong>
            <span>Labb rapid screens are for company (non-DOT) testing. Employees covered by DOT rules must still be tested under the DOT program.</span>
          </div>
        </div>
      </section>

      {handbook && (
        <section className="section">
          <div className="wrap split">
            <div>
              <span className="eyebrow">Free handbook</span>
              <h2>{handbook.shortTitle}</h2>
              <p className="intro">{handbook.lede}</p>
              <Link href={`/resources/${handbook.slug}`} className="btn btn-primary">Get the free handbook</Link>
            </div>
            <Image src={handbook.cover} alt={`${handbook.title} cover`} width={handbook.coverW} height={handbook.coverH} sizes="380px" style={{ maxWidth: 360, margin: "0 auto" }} />
          </div>
        </section>
      )}

      <section className={`section${handbook ? " soft" : ""}`}>
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Questions</span>
          <h2>{ind.name} drug testing FAQ</h2>
          <Faq items={ind.faqs} />
        </div>
      </section>
      <CtaBand title={`Ready to test on site?`} />
    </>
  );
}
