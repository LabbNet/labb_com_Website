import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AnswerText } from "@/components/AnswerText";
import { AskForm } from "@/components/AskForm";
import { Breadcrumbs, JsonLd } from "@/components/ui";
import { relatedApproved, type AskRow } from "@/lib/ask";
import { sql } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const [q] = await sql()<AskRow[]>`select * from ask_questions where slug = ${slug} and status = 'approved' and published`;
  return q ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const q = await load((await params).slug);
  if (!q) return { title: "Ask an Expert" };
  const desc = q.answer!.replace(/\s+/g, " ").slice(0, 155);
  return { title: q.question.slice(0, 90), description: desc, alternates: { canonical: `/ask/${q.slug}` }, openGraph: { title: q.question, description: desc, type: "article" } };
}

export default async function AskAnswer({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ asked?: string }> }) {
  const [{ slug }, { asked }] = await Promise.all([params, searchParams]);
  const q = await load(slug);
  if (!q) notFound();
  await sql()`update ask_questions set views = views + 1 where id = ${q.id}`;
  const related = await relatedApproved(q.question, q.id);

  return (
    <>
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap" style={{ maxWidth: 860 }}>
          <Breadcrumbs items={[{ name: "Ask an Expert", href: "/ask" }, { name: q.question.slice(0, 60), href: `/ask/${q.slug}` }]} />
          {asked && <p className="form-ok" role="status">We&apos;ve answered a question like yours before. Here&apos;s the answer from the Labb team.</p>}
          <span className="eyebrow">Ask an Expert</span>
          <h1 style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.4rem)", margin: "8px 0 18px" }}>{q.question}</h1>
          <div className="ask-answer">
            <span className="ask-by">Answered by the Labb team{q.reviewed_at ? ` · ${new Date(q.reviewed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" })}` : ""}</span>
            <AnswerText text={q.answer!} />
          </div>
          {q.sources?.length > 0 && (
            <p className="fine" style={{ textAlign: "left" }}>Sources: {q.sources.map((s, i) => (
              <span key={i}>{i ? " · " : ""}{s.url ? <Link href={s.url}>{s.title}</Link> : s.title}</span>
            ))}</p>
          )}
          {related.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: "1.25rem" }}>Related questions</h2>
              <ul className="ask-related">{related.map((r) => <li key={r.id}><Link href={`/ask/${r.slug}`}>{r.question}</Link></li>)}</ul>
            </div>
          )}
          <div className="hero-card" style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: "1.25rem", marginTop: 0 }}>Have a different question?</h2>
            <AskForm compact />
          </div>
          <p style={{ marginTop: 20 }}><Link href="/ask">← All answers</Link></p>
        </div>
      </section>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "QAPage", url: absoluteUrl(`/ask/${q.slug}`),
        mainEntity: {
          "@type": "Question", name: q.question, text: q.question, answerCount: 1, dateCreated: new Date(q.created_at).toISOString(),
          acceptedAnswer: { "@type": "Answer", text: q.answer, dateCreated: new Date(q.reviewed_at || q.updated_at).toISOString(), url: absoluteUrl(`/ask/${q.slug}`), author: { "@type": "Organization", name: "Labb", url: absoluteUrl("/") } },
        },
      }} />
    </>
  );
}
