import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, CtaBand, JsonLd } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { getResource, resources } from "@/lib/resources";
import { absoluteUrl, site } from "@/lib/site";

export function generateStaticParams() {
  return resources.map((r) => ({ slug: r.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = getResource((await params).slug);
  if (!r) return {};
  return {
    title: `Free ${r.shortTitle}`,
    description: r.metaDescription,
    alternates: { canonical: `/resources/${r.slug}` },
    openGraph: { images: [{ url: r.cover }] },
  };
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const r = getResource((await params).slug);
  if (!r) notFound();
  return (
    <>
      <Breadcrumbs items={[{ name: "Resources", href: "/resources" }, { name: r.shortTitle, href: `/resources/${r.slug}` }]} />
      <section className="hero form-hero">
        <div className="wrap">
          <div>
            <span className="eyebrow">{r.eyebrow}</span>
            <h1>{r.h1}</h1>
            <p className="lede">{r.lede}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center", marginTop: 12 }}>
              <Image src={r.cover} alt={`${r.title} cover`} width={r.coverW} height={r.coverH} priority style={{ width: 220, flex: "none" }} />
              <Checks items={r.facts} />
            </div>
          </div>
          <div className="hero-card" id="get">
            <LeadForm variant="handbook" resource={r.slug} industry={r.industry ? r.industry[0].toUpperCase() + r.industry.slice(1) : undefined} title="Get the free handbook" subtitle="Fill out the form and your download link appears right away." submitLabel="Download Handbook" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">What&apos;s inside</span>
          <h2>Everything you need to run screening on your own schedule</h2>
          <ol className="grid g3" style={{ listStyle: "none", padding: 0, marginTop: 28 }}>
            {r.chapters.map((c, i) => (
              <li key={c.title} className="card top">
                <span className="eyebrow" style={{ marginBottom: 8 }}>Chapter {i + 1}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <span className="eyebrow">Who it&apos;s for</span>
          <h2>Written for the people who keep work moving</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {r.audience.map((a) => (
              <div key={a.title} className="card">
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand title="Ready to take screening in-house?" body="Get the handbook, then talk to a Labb specialist about LabbHR and rapid testing." href="#get" label="Get the free handbook" />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Book",
          name: r.title,
          bookFormat: "https://schema.org/EBook",
          publisher: { "@id": `${site.url}/#org` },
          url: absoluteUrl(`/resources/${r.slug}`),
          image: absoluteUrl(r.cover),
          isAccessibleForFree: true,
        }}
      />
    </>
  );
}
