import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AnswerText } from "@/components/AnswerText";
import type { AskRow } from "@/lib/ask";
import { sql } from "@/lib/db";

export const metadata: Metadata = { title: "Your question", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Private page for the person who asked: shows "being reviewed" until a Labb admin approves the answer.
export default async function AskStatus({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) notFound();
  const [q] = await sql()<AskRow[]>`select * from ask_questions where token = ${token}`;
  if (!q) notFound();
  if (q.status === "approved" && q.published && q.slug) {
    return (
      <section className="section"><div className="wrap" style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: "1.8rem" }}>Your question has been answered</h1>
        <p><Link className="btn btn-primary" href={`/ask/${q.slug}`}>Read the answer</Link></p>
      </div></section>
    );
  }
  return (
    <section className="section"><div className="wrap" style={{ maxWidth: 760 }}>
      <span className="eyebrow">Ask an Expert</span>
      <h1 style={{ fontSize: "1.8rem", margin: "8px 0 16px" }}>{q.status === "approved" ? "Your answer" : "Thanks, we've got your question"}</h1>
      <div className="hero-card" style={{ textAlign: "left" }}>
        <p style={{ marginTop: 0 }}><strong>{q.question}</strong></p>
        {q.status === "approved" && q.answer ? (
          <div className="ask-answer"><AnswerText text={q.answer} /></div>
        ) : q.status === "rejected" ? (
          <p>We weren&apos;t able to answer this one here. Email <a href="mailto:info@labb.com">info@labb.com</a> and we&apos;ll help.</p>
        ) : (
          <p>The Labb team is checking the answer against our guidebooks. We&apos;ll email it to {q.email}, usually within one business day. You can also come back to this page.</p>
        )}
      </div>
      <p style={{ marginTop: 20 }}><Link href="/ask">← Ask another question</Link> · <Link href="/schedule">Book a call with Labb</Link></p>
    </div></section>
  );
}
