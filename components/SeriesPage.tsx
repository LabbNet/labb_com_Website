import Link from "next/link";
import { Breadcrumbs, Checks, KitCard } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { publishedKits, type Kit } from "@/lib/kits";

// Test kit series page: product information first, then the product options in the series.
export function SeriesPage(p: {
  slug: string;
  name: string;
  series: Kit["series"];
  title: string;
  lede: string;
  info: { title: string; body: React.ReactNode; points: string[] };
}) {
  const kits = publishedKits.filter((k) => k.series === p.series).sort((a, b) => a.drugCount - b.drugCount);
  return (
    <>
      <PageHero
        eyebrow={`Test kits · ${p.name}`}
        title={p.title}
        lede={p.lede}
        primary={{ href: "#options", label: "See product options" }}
        secondary={{ href: "/get-a-quote", label: "Get a quote" }}
      />
      <Breadcrumbs items={[{ name: "Test kits", href: "/test-kits" }, { name: p.name, href: `/test-kits/${p.slug}` }]} />

      <section className="section" id="info">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">Product information</span>
            <h2>{p.info.title}</h2>
            <div className="intro" style={{ marginBottom: 0 }}>{p.info.body}</div>
          </div>
          <div className="card rail">
            <h3>At a glance</h3>
            <Checks items={p.info.points} />
          </div>
        </div>
      </section>

      <section className="section soft" id="options">
        <div className="wrap">
          <span className="eyebrow">Product options</span>
          <h2>{p.name} panels</h2>
          <div className="grid g4" style={{ marginTop: 28 }}>
            {kits.map((k) => <KitCard key={k.slug} kit={k} />)}
          </div>
          <div className="btn-row"><Link href="/test-kits#compare" className="btn btn-outline-dark">Compare all panels</Link></div>
        </div>
      </section>
    </>
  );
}
