import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/AdminBar";
import { MemberQuoteLines } from "@/components/MemberQuoteLines";
import { QuoteEmailCard } from "@/components/QuoteEmailCard";
import { readFlash } from "@/lib/admin";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { leadName, type LeadRow } from "@/lib/leads";
import {
  getQuote, memberCosts, quoteEmailDraft, QUOTE_SECTIONS, sectionOf, shownDescription, money, PAYMENT_MODES, QUOTE_STATUS, quoteNumber, SERVICE_LEVELS, syncCatalogLines, totals, type ServiceLevel,
} from "@/lib/salesQuotes";

export const metadata: Metadata = { title: "Quote", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// A CPP member's quote for their client: prices, quantities, payment terms, send.
export default async function MemberSalesQuote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = (await currentMember())!;
  const [own] = await sql()<{ id: string }[]>`select id::text from sales_quotes where id = ${/^\d+$/.test(id) ? id : "0"} and member_id = ${m.id}`;
  if (!own) notFound();
  await syncCatalogLines(id);
  const data = await getQuote(id);
  if (!data) notFound();
  const { q, items } = data;
  const level: ServiceLevel = q.service_level === "sl3" ? "sl3" : "sl1";
  const [[lead], costs, flash, [me]] = await Promise.all([
    sql()<LeadRow[]>`select * from leads where id = ${q.lead_id}`,
    memberCosts(level),
    readFlash(),
    sql()<{ logo_png: string | null; clinic: string | null; phone: string | null }[]>`select logo_png, clinic, phone from members where id = ${m.id}`,
  ]);
  if (!lead) notFound();
  const t = totals(items);
  const emailDraft = await quoteEmailDraft(id);
  const locked = ["signed", "paid"].includes(q.status);
  const expires = new Date(q.expires_on).toISOString().slice(0, 10);
  const lines = items.map((i) => ({
    id: String(i.id), name: i.name, description: shownDescription(i) || null, section: QUOTE_SECTIONS.find((x) => x.key === sectionOf(i))!.title, sectionOrder: QUOTE_SECTIONS.findIndex((x) => x.key === sectionOf(i)), category: i.category, unit: i.unit, billing: i.billing,
    price: i.unit_cents, qty: i.qty, excluded: !!i.excluded,
    linkedCost: i.price_item_id ? costs.get(String(i.price_item_id)) ?? null : null, ownCost: i.cost_cents ?? null,
  })).map((l, n) => ({ ...l, n })).sort((a, b) => a.sectionOrder - b.sectionOrder || a.n - b.n);
  const act = (action: string, children: React.ReactNode) => (
    <form action="/api/members/sales-quotes" method="post"><input type="hidden" name="action" value={action} /><input type="hidden" name="quote" value={q.id} />{children}</form>
  );

  return (
    <section className="section qb" style={{ paddingTop: 24 }}>
      <div className="wrap">
        <p style={{ margin: "0 0 12px" }}><Link href="/members/quotes">&larr; My quotes</Link></p>
        <Flash flash={flash} />
        <header className="qb-head">
          <div>
            <span className="lp-eyebrow">{quoteNumber(q)} · quote from {me?.clinic || m.name}</span>
            <h1>{q.title}</h1>
            <p className="lp-org">{leadName(lead)}{lead.company ? `, ${lead.company}` : ""} · {lead.email}</p>
            <p className="lp-chips"><span className={`qs qs-${q.status}`}>{QUOTE_STATUS[q.status]}</span>
              {q.sent_at && <span className="tag plain">Sent {new Date(q.sent_at).toLocaleDateString("en-US")}</span>}
              <span className="tag plain">{q.open_count ? `Opened ${q.open_count}×` : "Not opened yet"}</span>
              <span className="tag plain">{PAYMENT_MODES.find((p) => p.value === q.payment_mode)?.short} collects payment</span></p>
            {locked && <p style={{ marginTop: 8 }}>Signed by <strong>{q.signed_name}</strong>{q.signed_title ? `, ${q.signed_title}` : ""}{q.signed_at ? ` on ${new Date(q.signed_at).toLocaleDateString("en-US")}` : ""}.</p>}
          </div>
          <div className="qb-due">
            <span>Due at acceptance</span><strong>{money(t.dueToday)}</strong>
            <em>{money(t.once)} one time{t.monthly ? ` + ${money(t.monthly)} first month of software` : ""}</em>
            <a href={`/quote/${q.token}?preview=1`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm qb-view">View quote</a>
          </div>
        </header>

        {!me?.logo_png && (
          <p className="hero-card" style={{ textAlign: "left", padding: "12px 16px" }}>Your quotes show your company name next to the Labb logo. <Link href="/members/quotes#branding">Add your logo</Link> to show it instead.</p>
        )}

        {act("save", <>
          <div className="hero-card">
            <h2>Quote settings</h2>
            <div className="qb-fields">
              <div className="field qb-wide"><label htmlFor="mq-title">Title</label><input id="mq-title" name="title" defaultValue={q.title} maxLength={200} disabled={locked} /></div>
              <div className="field"><label htmlFor="mq-exp">Valid until</label><input id="mq-exp" name="expires" type="date" defaultValue={expires} disabled={locked} />{q.status === "draft" && !q.expires_manual && <span className="fine">Becomes 30 days from the send date unless you change it.</span>}</div>
              <div className="field"><label htmlFor="mq-pay">Payment at acceptance</label>
                <select id="mq-pay" name="payment_mode" defaultValue={q.payment_mode} disabled={locked}>{PAYMENT_MODES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
              <div className="field"><label htmlFor="mq-sl">Your cost from</label>
                <select id="mq-sl" name="service_level" defaultValue={level} disabled={locked}>{SERVICE_LEVELS.map((s) => <option key={s.value} value={s.value}>{s.label} pricing</option>)}</select></div>
            </div>
          </div>
          <div className="hero-card">
            <h2>Line items</h2>
            <p className="fine" style={{ textAlign: "left", marginTop: -6 }}>Your cost comes from your CPP pricing. Enter the price you charge your client; the margin updates as you type. Rapid tests are priced per test and sold in boxes of 25. Every line is shown to your client with its price unless you check Remove from quote. Your client can change quantities of kits and equipment, but not software.</p>
            <MemberQuoteLines lines={lines} locked={locked} />
          </div>
          {!locked && <div className="qb-savebar"><button className="btn btn-primary" type="submit">Save changes</button><span className="fine">Save before you view or send the quote.</span></div>}
        </>)}

        {!locked && emailDraft && <QuoteEmailCard action="/api/members/sales-quotes" quoteId={q.id} draft={emailDraft} resend={q.status !== "draft"}
          extra={<><a className="btn btn-outline-dark" href={`/quote/${q.token}?preview=1`} target="_blank" rel="noreferrer">View quote</a></>} />}
        {!locked && q.status === "draft" && act("delete", <button className="linkish" type="submit">Delete draft</button>)}
      </div>
    </section>
  );
}
