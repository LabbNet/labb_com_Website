import Image from "next/image";
import { KitGallery } from "@/components/KitGallery";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, JsonLd, KitCard } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { badgeLabel, getKit, publishedKits } from "@/lib/kits";
import { absoluteUrl, site } from "@/lib/site";

export function generateStaticParams() {
  return publishedKits.map((k) => ({ slug: k.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const kit = getKit((await params).slug);
  if (!kit) return {};
  return {
    title: `${kit.code} ${kit.drugCount} Drug ${kit.specimen} Drug Test`,
    description: `${kit.name}: ${kit.summary.slice(0, 120)} Full panel and cutoffs.`,
    alternates: { canonical: `/test-kits/${kit.slug}` },
    openGraph: { images: [{ url: kit.image }] },
  };
}

const useNote: Record<string, string> = {
  EUO: "For workplace (non-DOT) testing programs.",
  OTC: "Over the counter and CLIA waived. Suitable for workplace programs and CLIA waived sites.",
  FUO: "Forensic use. For forensic programs only. Workplace programs should choose a Workplace or OTC kit.",
};

export default async function KitPage({ params }: { params: Promise<{ slug: string }> }) {
  const kit = getKit((await params).slug);
  if (!kit) notFound();
  const related = publishedKits.filter((k) => k.specimen === kit.specimen && k.slug !== kit.slug).slice(0, 3);

  return (
    <>
      <Breadcrumbs items={[{ name: "Test kits", href: "/test-kits" }, { name: kit.code, href: `/test-kits/${kit.slug}` }]} />
      <section className="section" style={{ paddingTop: 36 }}>
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <KitGallery main={{ src: kit.image, alt: `${kit.name} ${kit.specimen.toLowerCase()} drug test`, w: 900, h: 900 }} images={kit.gallery} />
            <h2 style={{ fontSize: "1.4rem", marginTop: 40 }}>Panel and cutoffs</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
              Cutoffs in ng/mL{kit.specimen === "Oral fluid" ? " of oral fluid" : ""}. The strip reads non-negative when the drug is at or above the cutoff.
            </p>
            <table className="panel-table">
              <thead>
                <tr><th scope="col">Code</th><th scope="col">Drug</th><th scope="col">Cutoff</th></tr>
              </thead>
              <tbody>
                {kit.drugs.map((d) => (
                  <tr key={d.code}><td>{d.code}</td><td>{d.name}</td><td>{d.cutoff}</td></tr>
                ))}
              </tbody>
            </table>
            {kit.validity && <p style={{ marginTop: 14, fontSize: "0.95rem" }}><strong>Specimen validity:</strong> {kit.validity}</p>}
          </div>

          <div>
            <span className={`pill${kit.badge === "FUO" ? " forensic" : ""}`}>{badgeLabel[kit.badge]}</span>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", marginTop: 12 }}>{kit.name}</h1>
            <p className="lede">{kit.summary}</p>
            <dl className="facts">
              <div><dt>Drugs</dt><dd>{kit.drugCount}</dd></div>
              <div><dt>Read time</dt><dd>{kit.readTime}</dd></div>
              {kit.facts.map((f) => (
                <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>
              ))}
            </dl>
            <p style={{ fontSize: "0.95rem" }}><strong>Who can use it:</strong> {useNote[kit.badge]}</p>
            <div className="chips" style={{ margin: "12px 0 24px" }}>
              {kit.goodFor.map((g) => <span key={g}>{g}</span>)}
            </div>
            {kit.dataSheet && (
              <p><a href={kit.dataSheet} target="_blank" rel="noopener">Download the {kit.code} data sheet (PDF)</a></p>
            )}
            <div className="hero-card" style={{ marginTop: 24 }}>
              <LeadForm variant="sample" compact title={`Get a quote or a free ${kit.code} sample`} submitLabel="Request a Sample" />
            </div>
          </div>
        </div>
      </section>

      {kit.procedure && (
        <section className="section" id="how-to-use">
          <div className="wrap">
            <span className="eyebrow">How to use</span>
            <h2>{kit.code} procedure</h2>
            <ol className="proc-steps">
              {kit.procedure.steps.map((st) => <li key={st}>{st}</li>)}
            </ol>
            <div className="proc-card">
              <Image src={kit.procedure.image} alt={`${kit.code} procedure card showing the five collection and reading steps and how to read positive, negative and invalid results`} width={1600} height={881} sizes="(max-width: 1240px) 94vw, 1150px" />
            </div>
          </div>
        </section>
      )}

      <section className="section soft">
        <div className="wrap">
          <div className="note" style={{ background: "#fff", marginBottom: 40 }}>
            <strong style={{ flex: "none" }}>Before you act on a result</strong>
            <span>
              This is a qualitative screen. A non-negative is preliminary and should be confirmed by a laboratory (GC/MS or LC/MS/MS).
              The package insert in the box is the official document for product performance.
            </span>
          </div>
          <h2>Related kits</h2>
          <div className="grid g3" style={{ marginTop: 20 }}>
            {related.map((k) => <KitCard key={k.slug} kit={k} />)}
          </div>
          <div className="btn-row"><Link href="/test-kits" className="btn btn-outline">All test kits</Link></div>
        </div>
      </section>
      <CtaBand />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: kit.name,
          sku: kit.code,
          brand: { "@type": "Brand", name: "Labb" },
          manufacturer: { "@id": `${site.url}/#org` },
          image: absoluteUrl(kit.image),
          description: kit.summary,
          category: `${kit.specimen} drug test`,
          url: absoluteUrl(`/test-kits/${kit.slug}`),
        }}
      />
    </>
  );
}
