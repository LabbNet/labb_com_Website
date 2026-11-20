import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Checks, JsonLd } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { drugProfile, drugProfiles, kitsFor, levelClass } from "@/lib/drugProfiles";
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return drugProfiles.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = drugProfile((await params).slug);
  if (!d) return { title: "Drug profile not found" };
  return {
    title: `${d.drug} Drug Test: What It Is, Detection and Screening | Labb Drug Profile`,
    description: `${d.drug} (${d.kicker.toLowerCase()}): what it is, effects and warning signs, why it matters at work, and how the Labb ${d.assay ?? ""} test works. Labb Screening Priority Index ${d.index}/10.`.replace("  ", " "),
    alternates: { canonical: `/drugs/${d.slug}` },
  };
}

export default async function DrugPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = drugProfile((await params).slug);
  if (!d) notFound();
  const kits = kitsFor(d);
  const i = drugProfiles.findIndex((x) => x.slug === d.slug);
  const prev = drugProfiles[i - 1];
  const next = drugProfiles[i + 1];

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${d.drug}: Labb Drug Profile`,
        about: d.drug,
        url: absoluteUrl(`/drugs/${d.slug}`),
        publisher: { "@type": "Organization", name: "Labb", url: absoluteUrl("/") },
      }} />
      <section className="section drug-hero">
        <div className="wrap drug-hero-in">
          <div>
            <span className="eyebrow">Drug Profile Series · No. {d.no}</span>
            <h1>{d.drug}</h1>
            <p className="drug-kicker">{d.kicker} · {d.drugClass}</p>
            <p className="lede">{d.bottom}</p>
            <div className="btn-row">
              <a href="#get" className="btn btn-primary">Get the full profile (PDF)</a>
              {kits.length > 0 && <a href="#test" className="btn btn-outline">How Labb tests for it</a>}
            </div>
          </div>
          <div className={`drug-index ${levelClass(d.level)}`} aria-label={`Labb Screening Priority Index ${d.index} out of 10, ${d.level} priority`}>
            <span className="di-label">Labb Screening Priority Index</span>
            <strong>{d.index}<small>/10</small></strong>
            <span className="di-level">{d.level} priority</span>
            <div className="di-bar" aria-hidden="true"><i style={{ width: `${d.index * 10}%` }} /></div>
            {d.assay && <span className="di-assay">Labb assay: <b>{d.assay}</b>{d.specimen ? ` · ${d.specimen}` : ""}</span>}
          </div>
        </div>
      </section>
      <Breadcrumbs items={[{ name: "Training", href: "/training" }, { name: "Drug profiles", href: "/drugs" }, { name: d.drug, href: `/drugs/${d.slug}` }]} />

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap drug-body">
          <article>
            <h2>What it is</h2>
            <p>{d.what}</p>
            {d.how && (<><h2>How it works</h2><p>{d.how}</p></>)}
            {d.used.length > 0 && (<><h2>How it is used</h2><Checks items={d.used} /></>)}
            {d.signs.length > 0 && (<><h2>Effects and warning signs</h2><Checks items={d.signs} /></>)}
            {d.work.length > 0 && (<><h2>Why it matters at work</h2><Checks items={d.work} /></>)}
            {d.reading && (
              <div id="test" className="drug-assay">
                <h2>The Labb {d.assay} test</h2>
                <p>{d.reading}</p>
                {kits.length > 0 && (
                  <table className="drug-kits">
                    <caption>Labb kits that test for {d.drug}, with screening cutoffs in ng/mL</caption>
                    <thead><tr><th scope="col">Kit</th><th scope="col">Specimen</th><th scope="col">Cutoff (ng/mL)</th></tr></thead>
                    <tbody>
                      {kits.map(({ kit, cutoff }) => (
                        <tr key={kit.slug}><th scope="row"><Link href={`/test-kits/${kit.slug}`}>{kit.name}</Link></th><td>{kit.specimen}</td><td>{cutoff}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!kits.length && d.available && <p className="fine" style={{ textAlign: "left" }}>Available on: {d.available}. <Link href="/test-kits">See all kits</Link>.</p>}
              </div>
            )}
            <p className="fine" style={{ textAlign: "left", marginTop: 28 }}>
              This profile is educational and does not replace a package insert, laboratory guidance or medical advice. A rapid test result is a
              Non-Negative screen until a laboratory confirms it.
            </p>
            <nav className="drug-pager" aria-label="More drug profiles">
              {prev ? <Link href={`/drugs/${prev.slug}`}>← {prev.drug}</Link> : <span />}
              <Link href="/drugs">All drug profiles</Link>
              {next ? <Link href={`/drugs/${next.slug}`}>{next.drug} →</Link> : <span />}
            </nav>
          </article>
          <aside className="drug-side">
            <div className="hero-card" id="get">
              <LeadForm variant="handbook" resource={`drug-profile:${d.slug}`} title={`Get the full ${d.drug} profile`} subtitle="The two-page PDF adds detection windows, history, positivity data, where use is highest and panel guidance by program type." submitLabel="Download the profile" />
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
