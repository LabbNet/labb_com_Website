import Link from "next/link";
import { Breadcrumbs, Checks, Faq, KitCard } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { getKit } from "@/lib/kits";
import type { Segment } from "@/lib/segments";

type Card = { t: string; b: React.ReactNode };

// Shared layout for the "Who we serve" audience pages. Product facts come from lib/platforms and
// lib/kits; each page supplies its own headline, pains, answer and call to action.
export function SegmentPage(p: {
  slug: string;
  crumb: string;
  eyebrow: string;
  title: string;
  lede: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  problem: { eyebrow?: string; title: string; body: React.ReactNode };
  pains?: string[];
  answer: { eyebrow: string; title: string; cards: Card[]; link?: { href: string; label: string } };
  extra?: { eyebrow: string; title: string; body: React.ReactNode; checks?: string[]; side?: Card; link?: { href: string; label: string } };
  kits?: { title: string; intro: string; slugs: string[] };
  faqs?: { q: string; a: string }[];
  form: { segment: Segment; products: string[]; title: string; intro: string; heading: string; submit: string; variant?: "demo" | "quote" };
}) {
  const kits = (p.kits?.slugs || []).map(getKit).filter((k): k is NonNullable<ReturnType<typeof getKit>> => Boolean(k));
  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lede={p.lede} primary={p.primary} secondary={p.secondary} />
      <Breadcrumbs items={[{ name: p.crumb, href: `/${p.slug}` }]} />

      <section className="section tight">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">{p.problem.eyebrow || "The problem"}</span>
            <h2>{p.problem.title}</h2>
            <div className="intro" style={{ marginBottom: 0 }}>{p.problem.body}</div>
          </div>
          {p.pains && (
            <div className="card rail">
              <h3>What gets in the way</h3>
              <Checks items={p.pains} />
            </div>
          )}
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <span className="eyebrow">{p.answer.eyebrow}</span>
          <h2>{p.answer.title}</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {p.answer.cards.map((c, i) => (
              <div key={c.t} className="card top">
                <div className="icon-dot" aria-hidden="true">{i + 1}</div>
                <h3>{c.t}</h3>
                <p>{c.b}</p>
              </div>
            ))}
          </div>
          {p.answer.link && <div className="btn-row"><Link href={p.answer.link.href} className="btn btn-outline-dark">{p.answer.link.label}</Link></div>}
        </div>
      </section>

      {p.extra && (
        <section className="section">
          <div className="wrap split" style={{ alignItems: "start" }}>
            <div>
              <span className="eyebrow">{p.extra.eyebrow}</span>
              <h2>{p.extra.title}</h2>
              <div className="intro" style={{ marginBottom: 0 }}>{p.extra.body}</div>
              {p.extra.checks && <Checks items={p.extra.checks} />}
              {p.extra.link && <div className="btn-row"><Link href={p.extra.link.href} className="btn btn-outline">{p.extra.link.label}</Link></div>}
            </div>
            {p.extra.side && (
              <div className="card rail">
                <h3>{p.extra.side.t}</h3>
                <p>{p.extra.side.b}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {kits.length > 0 && p.kits && (
        <section className={`section${p.extra ? " soft" : ""}`}>
          <div className="wrap">
            <span className="eyebrow">Test kits</span>
            <h2>{p.kits.title}</h2>
            <p className="intro">{p.kits.intro}</p>
            <div className="grid g4">{kits.map((k) => <KitCard key={k.slug} kit={k} />)}</div>
            <div className="btn-row"><Link href="/test-kits" className="btn btn-outline-dark">See all kits</Link></div>
          </div>
        </section>
      )}

      {p.faqs && (
        <section className="section">
          <div className="wrap" style={{ maxWidth: 860 }}>
            <span className="eyebrow">Questions</span>
            <h2>Common questions</h2>
            <Faq items={p.faqs} />
          </div>
        </section>
      )}

      <section className="section soft" id="contact">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">{p.form.heading}</span>
            <h2>{p.form.title}</h2>
            <p>{p.form.intro}</p>
            <p className="program-note">Your testing goals, our technology and support: Labb builds the program around your goals and keeps it on track.</p>
          </div>
          <div className="hero-card">
            <LeadForm variant={p.form.variant || "demo"} segment={p.form.segment} products={p.form.products} title={p.form.heading} submitLabel={p.form.submit} />
          </div>
        </div>
      </section>
    </>
  );
}
