import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { quotesFor } from "@/lib/quotes";

export const metadata: Metadata = { title: "Print quote", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

// Printable copy of a member's quote. The member prints or saves it as a PDF; the site never sends it to the client.
export default async function PrintQuote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = (await currentMember())!;
  if (!/^\d+$/.test(id)) notFound();
  const q = (await quotesFor({ memberId: m.id })).find((x) => x.id === id);
  if (!q) notFound();
  const [lead] = await sql()<{ company: string | null; first_name: string | null; last_name: string | null; email: string; phone: string | null; city: string | null; state: string | null }[]>`
    select company, first_name, last_name, email, phone, city, state from leads where id = ${q.lead_id}`;
  const contact = [lead?.first_name, lead?.last_name].filter(Boolean).join(" ");
  const monthly = q.items.reduce((t, i) => t + (i.monthly_volume ?? 0) * i.unit_price_cents, 0);

  return (
    <section className="section print-quote" style={{ paddingTop: 28 }}>
      <div className="wrap" style={{ maxWidth: 900 }}>
        <div className="no-print pq-bar">
          <Link href="/members/quotes">&larr; My quotes</Link>
          <PrintButton />
        </div>
        <div className="pq-sheet">
          <div className="pq-head">
            <div>
              <h1>Quote</h1>
              <p className="pq-meta">Quote #{q.id} · {q.quoted_on}</p>
            </div>
            <div className="pq-from">
              <strong>{m.clinic || m.name}</strong>
              {m.clinic && <span>{m.name}</span>}
              <span>{m.email}</span>
            </div>
          </div>
          <div className="pq-to">
            <span className="pq-label">Prepared for</span>
            <strong>{lead?.company || contact || lead?.email}</strong>
            {lead?.company && contact && <span>{contact}</span>}
            {lead?.email && <span>{lead.email}</span>}
            {lead?.phone && <span>{lead.phone}</span>}
            {(lead?.city || lead?.state) && <span>{[lead?.city, lead?.state].filter(Boolean).join(", ")}</span>}
          </div>
          <table className="pq-table">
            <thead>
              <tr><th scope="col">Product or service</th><th scope="col">Qty</th><th scope="col">Unit price</th><th scope="col">Expected per month</th><th scope="col">Amount</th></tr>
            </thead>
            <tbody>
              {q.items.map((i, n) => (
                <tr key={n}>
                  <td>{i.product_name}{(i.sku || i.unit) && <span className="pq-sub">{[i.sku, i.unit].filter(Boolean).join(" · ")}</span>}</td>
                  <td>{i.quantity.toLocaleString()}</td>
                  <td>{money(i.unit_price_cents)}</td>
                  <td>{i.monthly_volume != null ? i.monthly_volume.toLocaleString() : ""}</td>
                  <td>{money(i.quantity * i.unit_price_cents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><th scope="row" colSpan={4}>Total</th><td>{money(q.total_cents)}</td></tr>
              {monthly > 0 && <tr className="pq-monthly"><th scope="row" colSpan={4}>Estimated monthly spend at expected volume</th><td>{money(monthly)}</td></tr>}
            </tfoot>
          </table>
          {q.notes && <div className="pq-notes"><span className="pq-label">Notes</span><p>{q.notes}</p></div>}
          <p className="pq-foot">Prices are valid as quoted on {q.quoted_on}. Questions: {m.email}.</p>
        </div>
      </div>
    </section>
  );
}
