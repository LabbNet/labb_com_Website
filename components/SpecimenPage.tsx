import { Breadcrumbs, Checks, CtaBand, Faq, KitCard } from "@/components/ui";
import { publishedKits, type Kit } from "@/lib/kits";
import { PageHero } from "@/components/PageHero";

type Props = {
  specimen: Kit["specimen"];
  path: string;
  crumb: string;
  eyebrow: string;
  h1: React.ReactNode;
  lede: string;
  image: { src: string; alt: string; w: number; h: number };
  checks: string[];
  benefits: { t: string; b: string }[];
  faqs: { q: string; a: string }[];
};

export function SpecimenPage(p: Props) {
  const kits = publishedKits.filter((k) => k.specimen === p.specimen);
  return (
    <>
      <PageHero
        eyebrow={p.eyebrow}
        title={p.h1}
        lede={p.lede}
        primary={{ href: "/get-a-quote", label: "Get a quote" }}
        secondary={{ href: "/get-a-quote?sample=1", label: "Request a free sample" }}
        image={p.image}
      />
      <Breadcrumbs items={[{ name: "Test kits", href: "/test-kits" }, { name: p.crumb, href: p.path }]} />
      <section className="section tight">
        <div className="wrap"><Checks items={p.checks} /></div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Why {p.specimen.toLowerCase()}</span>
          <h2>Benefits for your program</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {p.benefits.map((b) => (
              <div key={b.t} className="card top">
                <h3>{b.t}</h3>
                <p>{b.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <span className="eyebrow">{p.specimen} kits</span>
          <h2>Choose a panel</h2>
          <p className="intro">Cutoffs and full drug lists are on each kit page. Every kit reads on Labb Station.</p>
          <div className="grid g3">
            {kits.map((k) => <KitCard key={k.slug} kit={k} />)}
          </div>
          <div className="note" style={{ marginTop: 28 }}>
            <strong style={{ flex: "none" }}>Note</strong>
            <span>Labb rapid screens are for company (non-DOT) testing. Every non-negative screen should be confirmed by a laboratory before any decision.</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Questions</span>
          <h2>{p.specimen} drug testing FAQ</h2>
          <Faq items={p.faqs} />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
