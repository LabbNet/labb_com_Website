import { NextResponse } from "next/server";
import { enrollInLms, stripe, stripeEnabled } from "@/lib/commerce";
import { sql } from "@/lib/db";
import { deliverLead, leadFromRow, logLeadEvent, type LeadRow } from "@/lib/leads";

// Stripe -> fulfillment. Set the endpoint in Stripe to /api/stripe/webhook and put the
// signing secret in STRIPE_WEBHOOK_SECRET.
export async function POST(req: Request) {
  if (!stripeEnabled || !process.env.STRIPE_WEBHOOK_SECRET) return new NextResponse("Not configured", { status: 404 });
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig!, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new NextResponse("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const email = s.customer_details?.email || s.customer_email;
    const course = s.metadata?.lmsCourse;
    if (email && course) await enrollInLms(email, course);

    // Quick Test: mark the order paid, record it in the lead history and notify Labb.
    if (s.metadata?.kind === "quick-test" && s.metadata.leadId) {
      const id = s.metadata.leadId;
      const db = sql();
      const [row] = await db<LeadRow[]>`select * from leads where id = ${id}`;
      const already = (row?.data as { details?: { paid?: string } })?.details?.paid;
      if (row && !already) {
        const amount = s.amount_total != null ? `$${(s.amount_total / 100).toFixed(2)}` : "paid";
        await db`update leads set data = jsonb_set(data, '{details,paid}', to_jsonb(${`Paid ${amount} (Stripe ${s.payment_intent || s.id})`}::text), true), updated_at = now() where id = ${id}`;
        await logLeadEvent(id, "paid", `Paid ${amount} through Stripe`);
        const [fresh] = await db<LeadRow[]>`select * from leads where id = ${id}`;
        await deliverLead(leadFromRow(fresh), id);
      }
    }
  }
  return NextResponse.json({ received: true });
}
