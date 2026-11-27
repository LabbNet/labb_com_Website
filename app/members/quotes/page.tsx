import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/AdminBar";
import { QuoteList } from "@/components/QuoteList";
import { readFlash } from "@/lib/admin";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { quotesFor, QUOTE_STATUSES } from "@/lib/quotes";
import { leadName, type LeadRow } from "@/lib/leads";
import { SEGMENTS } from "@/lib/segments";
import { QUOTE_KINDS, QUOTE_STATUS, quoteNumber, totals, type QuoteItem } from "@/lib/salesQuotes";

export const metadata: Metadata = { title: "My quotes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Every quote this CPP member has recorded, across all leads.
export default async function MemberQuotes() {
  const m = (await currentMember())!;
  const db = sql();
  const [quotes, flash, sent, myLeads, [me]] = await Promise.all([
    quotesFor({ memberId: m.id }), readFlash(),
    db<{ id: string; title: string; status: string; created_at: Date; sent_at: Date | null; open_count: number; lead_name: string }[]>`
      select q.id::text, q.title, q.status, q.created_at, q.sent_at, q.open_count, coalesce(nullif(l.company, ''), trim(concat(l.first_name, ' ', l.last_name)), l.email) as lead_name
      from sales_quotes q join leads l on l.id = q.lead_id where q.member_id = ${m.id} order by q.created_at desc`,
    db<LeadRow[]>`select * from leads where partner_id = ${m.id} and owner = 'partner' and not archived order by coalesce(company, first_name, email)`,
    db<{ logo_png: string | null; clinic: string | null }[]>`select logo_png, clinic from members where id = ${m.id}`,
  ]);
  const quotable = myLeads.filter((l) => l.segment !== "collection-site");
  const sqItems = sent.length ? await db<(QuoteItem & { quote_id: string })[]>`select i.*, coalesce(i.category, p.category) as category from sales_quote_items i left join quote_price_items p on p.id = i.price_item_id where i.quote_id = any(${sent.map((q) => q.id)}::bigint[])` : [];
  const due = (id: string) => totals(sqItems.filter((i) => String(i.quote_id) === id)).dueToday;
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
        <Flash flash={flash} />
        <div className="hero-card mq-new">
          <h2>Send a quote to a client</h2>
          <p className="fine" style={{ textAlign: "left" }}>Build a quote with your prices, your company and your logo next to Labb&apos;s. Your client reviews it, changes quantities, signs and accepts online. You see your cost and margin on every line; your client never does.</p>
          <p className="fine" style={{ textAlign: "left" }}>Quote any company except clinics and collection sites, which Labb quotes.</p>
          {quotable.length > 0 && (
            <form action="/api/members/sales-quotes" method="post" className="mq-newform">
              <input type="hidden" name="action" value="create" />
              <select name="lead" aria-label="Client" required defaultValue="">
                <option value="" disabled>Choose a client from My leads</option>
                {quotable.map((l) => <option key={l.id} value={l.id}>{l.company ? `${l.company} (${leadName(l)})` : leadName(l)}</option>)}
              </select>
              <select name="kind" aria-label="Quote type" defaultValue="employer">{QUOTE_KINDS.filter((k) => k.value !== "clinic").map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
              <button className="btn btn-primary" type="submit">Start a quote</button>
            </form>
          )}
          <details className="mq-newclient" open={!quotable.length}>
            <summary>Quote a new client</summary>
            <form action="/api/members/sales-quotes" method="post" className="mq-clientform">
              <input type="hidden" name="action" value="create" /><input type="hidden" name="lead" value="new" />
              <div className="field"><label htmlFor="nc-co">Company<span className="req">*</span></label><input id="nc-co" name="company" required maxLength={160} /></div>
              <div className="field"><label htmlFor="nc-seg">Type of client<span className="req">*</span></label>
                <select id="nc-seg" name="segment" required defaultValue="">
                  <option value="" disabled>Choose one</option>
                  {SEGMENTS.filter((s) => s.value !== "collection-site" && s.value !== "individual").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select></div>
              <div className="field"><label htmlFor="nc-fn">Contact first name<span className="req">*</span></label><input id="nc-fn" name="first_name" required maxLength={80} /></div>
              <div className="field"><label htmlFor="nc-ln">Last name</label><input id="nc-ln" name="last_name" maxLength={80} /></div>
              <div className="field"><label htmlFor="nc-em">Email<span className="req">*</span></label><input id="nc-em" name="email" type="email" required maxLength={200} /></div>
              <div className="field"><label htmlFor="nc-ph">Phone</label><input id="nc-ph" name="phone" type="tel" maxLength={30} /></div>
              <div className="field"><label htmlFor="nc-kind">Quote type</label><select id="nc-kind" name="kind" defaultValue="employer">{QUOTE_KINDS.filter((k) => k.value !== "clinic").map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
              <div className="field" style={{ alignSelf: "end" }}><button className="btn btn-primary" type="submit">Add client and start a quote</button></div>
            </form>
            <p className="fine" style={{ textAlign: "left" }}>The client is added to My leads.</p>
          </details>
        </div>
        {sent.length > 0 && (
          <div className="hero-card" style={{ textAlign: "left" }}>
            <h2>Client quotes</h2>
            <table className="meet-table">
              <thead><tr><th>Quote</th><th>Client</th><th>Status</th><th className="num">Due at acceptance</th></tr></thead>
              <tbody>{sent.map((q) => (
                <tr key={q.id}><td><Link href={`/members/sales-quotes/${q.id}`}>{quoteNumber(q)}</Link><br /><span className="fine">{q.title}</span></td><td>{q.lead_name}</td>
                  <td><span className={`qs qs-${q.status}`}>{QUOTE_STATUS[q.status] || q.status}</span>{q.open_count ? <span className="fine"> · opened {q.open_count}×</span> : null}</td><td className="num">{money(due(q.id))}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="hero-card mq-brand" id="branding" style={{ textAlign: "left" }}>
          <h2>Your logo on quotes</h2>
          <p className="fine" style={{ textAlign: "left" }}>Labb&apos;s logo stays first on every quote. Yours appears beside it with &ldquo;Labb Authorized Channel Partner&rdquo;. We convert it to dark grey so it matches the Labb color scheme. PNG, JPG, WebP or SVG, up to 3 MB.</p>
          <div className="mq-logo">
            {me?.logo_png ? <img src={me.logo_png} alt="Your logo, in dark grey" /> : <span className="fine">No logo yet. Your quotes show {me?.clinic || m.name} as text.</span>}
          </div>
          <form action="/api/members/logo" method="post" encType="multipart/form-data" className="mq-newform">
            <input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" required aria-label="Logo file" />
            <button className="btn btn-primary" type="submit">{me?.logo_png ? "Replace logo" : "Upload logo"}</button>
          </form>
          {me?.logo_png && <form action="/api/members/logo" method="post"><input type="hidden" name="remove" value="1" /><button className="linkish" type="submit">Remove logo</button></form>}
        </div>
        <h2 style={{ fontSize: "1.3rem", marginTop: 28 }}>Recorded quotes</h2>
        <p>Quotes you&apos;ve recorded for leads from Labb. They stay in your account for tracking and help Labb report average pricing by product, region and industry. They are never sent to the client. Record a new quote from <Link href="/members/leads">My leads</Link>.</p>
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
