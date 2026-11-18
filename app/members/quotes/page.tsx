import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/AdminBar";
import { QuoteList } from "@/components/QuoteList";
import { readFlash } from "@/lib/admin";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { quotesFor, QUOTE_STATUSES } from "@/lib/quotes";

export const metadata: Metadata = { title: "My quotes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Every quote this CPP member has recorded, across all leads.
export default async function MemberQuotes() {
  const m = (await currentMember())!;
  const [quotes, flash] = await Promise.all([quotesFor({ memberId: m.id }), readFlash()]);
  const leads = quotes.length
    ? await sql()<{ id: string; company: string | null; first_name: string | null; last_name: string | null; email: string }[]>`
        select id, company, first_name, last_name, email from leads where id = any(${[...new Set(quotes.map((q) => q.lead_id))]}::bigint[])`
    : [];
  const names = Object.fromEntries(leads.map((l) => [String(l.id), l.company || [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email]));
  const sum = (s?: string) => quotes.filter((q) => !s || q.status === s).reduce((t, q) => t + q.total_cents, 0);
  const count = (s: string) => quotes.filter((q) => q.status === s).length;

  return (
    <section className="section" style={{ paddingTop: 32 }}>
      <div className="wrap">
        <h1 style={{ fontSize: "1.8rem" }}>My quotes</h1>
        <p>Quotes you&apos;ve recorded for leads from Labb. They stay in your account for tracking and help Labb report average pricing by product, region and industry. They are never sent to the client. Record a new quote from <Link href="/members/leads">My leads</Link>.</p>
        <Flash flash={flash} />
        <div className="stats" style={{ margin: "20px 0 24px" }}>
          <div><strong>{quotes.length}</strong><span>Quotes</span></div>
          {QUOTE_STATUSES.filter((s) => s.value !== "draft").map((s) => (
            <div key={s.value}><strong>{count(s.value)}</strong><span>{s.label}</span></div>
          ))}
          <div><strong>{money(sum("accepted"))}</strong><span>Accepted value</span></div>
        </div>
        {quotes.length ? <QuoteList quotes={quotes} back="quotes" leadNames={names} /> : <p className="hero-card">No quotes yet. Open a lead in <Link href="/members/leads">My leads</Link> and choose Record a quote.</p>}
      </div>
    </section>
  );
}
