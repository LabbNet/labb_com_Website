import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteFrame } from "@/components/QuoteFrame";
import { QuoteOrder } from "@/components/QuoteOrder";
import { SignaturePad } from "@/components/SignaturePad";
import { currentMember } from "@/lib/auth";
import { stripeEnabled } from "@/lib/commerce";
import { leadName } from "@/lib/leads";
import { getQuoteByToken, money, quoteNumber, renderQuote, totals } from "@/lib/salesQuotes";

export const metadata: Metadata = { title: "Your Labb quote", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const day = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

// A lead's quote: open it, adjust quantities, sign and pay what's due today.
export default async function QuotePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ open?: string; paid?: string; signed?: string; e?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const data = await getQuoteByToken(token);
  if (!data) notFound();
  const { q, items, lead, rep } = data;
  const me = await currentMember();
  const staff = me?.role === "admin";
  if (q.status === "draft" && !staff) notFound();
  const expired = new Date(q.expires_on) < new Date(new Date().toISOString().slice(0, 10)) && !["signed", "paid"].includes(q.status);
  const t = totals(items);
  const open = sp.open === "1" || sp.paid === "1" || sp.signed === "1" || q.status === "signed" || q.status === "paid";
  const editable = ["sent", "viewed"].includes(q.status) && !expired;
  const who = lead.company || leadName(lead);

  return (
    <section className="section qp">
      <div className="wrap" style={{ maxWidth: 980 }}>
        {staff && <p className="qp-staff">You&apos;re signed in as Labb staff. Opening this page doesn&apos;t count as the lead opening it.</p>}
        {!open ? (
          <div className="hero-card qp-cover">
            <span className="lp-eyebrow">Quote {quoteNumber(q)}</span>
            <h1>{q.title}</h1>
            <p>Prepared for {leadName(lead)}{lead.company ? `, ${lead.company}` : ""} by {rep?.name || "the Labb team"}.</p>
            {expired ? <p className="form-error">This quote expired on {day(q.expires_on)}. Contact {rep?.email || "info@labb.com"} for an updated quote.</p> : (
              <>
                <p className="qp-due">Due at acceptance: <strong>{money(t.dueToday)}</strong></p>
                <form action="/api/quote" method="post">
                  <input type="hidden" name="token" value={token} /><input type="hidden" name="action" value="open" />
                  <button className="btn btn-primary" type="submit">Open your quote</button>
                </form>
                <p className="fine">Valid until {day(q.expires_on)}.</p>
              </>
            )}
          </div>
        ) : (
          <>
            {sp.paid === "1" || q.status === "paid" ? (
              <div className="qp-banner ok"><strong>Thank you. Your order is confirmed.</strong> {q.paid_cents != null ? `We received ${money(q.paid_cents)}. ` : "Your payment is being confirmed. "}Your Labb team will contact you about onboarding and shipping.</div>
            ) : q.status === "signed" ? (
              <div className="qp-banner"><strong>Signed by {q.signed_name}.</strong> {stripeEnabled ? <>Complete payment of <strong>{money(t.dueToday)}</strong> to finalize your order.</> : <>Your Labb rep will send an invoice for {money(t.dueToday)} to finalize your order.</>}
                {stripeEnabled && <form action="/api/quote" method="post" style={{ display: "inline" }}><input type="hidden" name="token" value={token} /><input type="hidden" name="action" value="pay" /> <button className="btn btn-primary btn-sm" type="submit">Pay now</button></form>}
                {sp.e === "pay" && <span className="form-error"> Checkout couldn&apos;t start. Try again or contact {rep?.email || "info@labb.com"}.</span>}
              </div>
            ) : expired ? (
              <div className="qp-banner"><strong>This quote expired on {day(q.expires_on)}.</strong> Contact {rep?.email || "info@labb.com"} for an updated quote.</div>
            ) : q.status === "declined" ? (
              <div className="qp-banner">This quote is no longer active. Contact {rep?.email || "info@labb.com"} with any questions.</div>
            ) : null}

            <div className="qp-doc"><QuoteFrame html={renderQuote(q, items, lead, rep)} title={`Quote ${quoteNumber(q)}`} /></div>

            <div className="hero-card qp-order">
              <h2>{editable ? "Review and adjust your order" : "Your order"}</h2>
              {editable && <p className="fine" style={{ textAlign: "left", marginTop: -6 }}>Change the number of test kits, readers or other items, then select Update my quote. Totals update as you go.</p>}
              <QuoteOrder token={token} editable={editable} items={items.map((i) => ({ id: String(i.id), name: i.name, description: i.description, sku: i.sku, unit: i.unit, unit_cents: i.unit_cents, qty: i.qty, min_qty: i.min_qty, adjustable: i.adjustable, billing: i.billing }))} />
            </div>

            {editable && (
              <form id="accept" action="/api/quote" method="post" className="hero-card qp-accept">
                <h2>Accept and sign</h2>
                <p>Sign to accept quote {quoteNumber(q)} for {who}. {t.dueToday > 0 ? <>You&apos;ll then pay <strong>{money(t.dueToday)}</strong>{stripeEnabled ? " by card or bank on a secure checkout page" : ""} to finalize your order.</> : null}</p>
                {sp.e === "sign" && <p className="form-error">Type your full name and check both boxes to sign.</p>}
                {sp.e === "empty" && <p className="form-error">Add at least one item before you accept.</p>}
                <input type="hidden" name="token" value={token} /><input type="hidden" name="action" value="accept" />
                <div className="qp-fields">
                  <div className="field"><label htmlFor="s-name">Full name<span className="req">*</span></label><input id="s-name" name="name" required minLength={3} maxLength={120} autoComplete="name" defaultValue={leadName(lead) !== lead.email ? leadName(lead) : ""} /></div>
                  <div className="field"><label htmlFor="s-title">Title</label><input id="s-title" name="title" maxLength={120} autoComplete="organization-title" /></div>
                </div>
                <div className="field"><label>Signature (draw with your mouse or finger)</label><SignaturePad /></div>
                <label className="qp-check"><input type="checkbox" name="agree" value="1" required /> I accept this quote for {who} and confirm I&apos;m authorized to sign for it. Prices and quantities are as shown above{t.monthly > 0 ? "; software bills monthly after the first month" : ""}. Lab and MRO services are billed as used.</label>
                <label className="qp-check"><input type="checkbox" name="esign" value="1" required /> I agree to sign electronically. My typed name and signature have the same effect as a handwritten signature.</label>
                <button className="btn btn-primary" type="submit">{t.dueToday > 0 && stripeEnabled ? `Sign and continue to payment (${money(t.dueToday)})` : "Sign and accept"}</button>
                <p className="fine" style={{ textAlign: "left" }}>We record your name, the date and time, and your IP address with your signature. Questions first? Email {rep?.email || "info@labb.com"}{rep?.phone ? ` or call ${rep.phone}` : ""}.</p>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
