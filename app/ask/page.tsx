import Link from "next/link";
import type { Metadata } from "next";
import { AskForm } from "@/components/AskForm";
import { PageHero } from "@/components/PageHero";
import { Breadcrumbs, JsonLd } from "@/components/ui";
import { sql } from "@/lib/db";
import { resources } from "@/lib/resources";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ask an Expert: Drug Testing and Background Screening Answers",
  description: "Ask Labb's drug testing experts about test kits, drug panels, cutoffs, policies, collection, background checks and running a testing program. Answers come from the Labb guidebooks.",
  alternates: { canonical: "/ask" },
};
export const dynamic = "force-dynamic";

const MSG: Record<string, [string, boolean]> = {
  short: ["Please write out your question in a few more words.", true],
  email: ["Add your email so we can send you the answer.", true],
  slow: ["You've asked several questions in a short time. Please try again in a little while.", true],
  sent: ["Thanks. Your question was received.", false],
};

export default async function Ask({ searchParams }: { searchParams: Promise<{ search?: string; m?: string; q?: string }> }) {
  const { search = "", m, q } = await searchParams;
  const s = search.trim().slice(0, 200);
  const db = sql();
  const list = s
    ? await db<{ question: string; slug: string; answer: string }[]>`
        select question, slug, answer from ask_questions where status = 'approved' and published and slug is not null
          and (tsv @@ websearch_to_tsquery('english', ${s}) or lower(question) % lower(${s}))
        order by ts_rank(tsv, websearch_to_tsquery('english', ${s})) desc, similarity(lower(question), lower(${s})) desc limit 40`.catch(() => [])
    : await db<{ question: string; slug: string; answer: string }[]>`
        select question, slug, answer from ask_questions where status = 'approved' and published and slug is not null
        order by views desc, reviewed_at desc limit 40`.catch(() => []);
  const msg = m ? MSG[m] : undefined;

  return (
    <>
      <PageHero
        eyebrow="Ask an Expert"
        title="Ask Labb's drug testing experts"
        lede="Questions about test kits, drug panels, cutoffs, policy, collection or background checks? Ask here. Answers come from the Labb guidebooks and are checked by the Labb team."
        primary={{ href: "#ask", label: "Ask a question" }}
        secondary={{ href: "#answers", label: "Browse answers" }}
      />
      <Breadcrumbs items={[{ name: "Ask an Expert", href: "/ask" }]} />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap ask-layout">
          <div id="ask">
            <h2 style={{ marginTop: 0 }}>Ask a question</h2>
            {msg && <p className={msg[1] ? "form-error" : "form-ok"} role="status">{msg[0]}</p>}
            <AskForm question={q || ""} />
          </div>
          <aside className="hero-card ask-side">
            <h3 style={{ marginTop: 0 }}>Where the answers come from</h3>
            <p className="fine" style={{ textAlign: "left" }}>Labb&apos;s guidebooks, kit data sheets and drug profiles. Free to download:</p>
            <ul className="ask-books">
              {resources.map((r) => <li key={r.slug}><Link href={`/resources/${r.slug}`}>{r.shortTitle}</Link></li>)}
              <li><Link href="/drugs">Drug profiles</Link></li>
              <li><Link href="/test-kits">Test kits and cutoffs</Link></li>
            </ul>
          </aside>
        </div>
      </section>
      <section className="section soft" id="answers">
        <div className="wrap">
          <div className="ask-head">
            <h2 style={{ margin: 0 }}>{s ? `Answers about "${s}"` : "Answered questions"}</h2>
            <form action="/ask#answers" method="get" className="ask-search" role="search">
              <label htmlFor="ask-s" className="sr-only">Search answers</label>
              <input id="ask-s" name="search" defaultValue={s} placeholder="Search answers, for example fentanyl or random testing" />
              <button className="btn btn-outline-dark" type="submit">Search</button>
            </form>
          </div>
          {!list.length ? (
            <p style={{ marginTop: 18 }}>{s ? "No answers match yet. Ask it above and the Labb team will answer." : "Answers will appear here as the Labb team approves them."}</p>
          ) : (
            <ul className="ask-list">
              {list.map((x) => (
                <li key={x.slug}>
                  <Link href={`/ask/${x.slug}`}><strong>{x.question}</strong></Link>
                  <p>{x.answer.replace(/\s+/g, " ").slice(0, 200)}{x.answer.length > 200 ? "..." : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      {list.length > 0 && (
        <JsonLd data={{
          "@context": "https://schema.org", "@type": "FAQPage", url: absoluteUrl("/ask"),
          mainEntity: list.slice(0, 20).map((x) => ({ "@type": "Question", name: x.question, acceptedAnswer: { "@type": "Answer", text: x.answer, url: absoluteUrl(`/ask/${x.slug}`) } })),
        }} />
      )}
    </>
  );
}
