import { NextResponse } from "next/server";
import { enrollInLms, stripe, stripeEnabled } from "@/lib/commerce";
import { getCourse, grantCourse } from "@/lib/courses";
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

  // checkout.session.completed fires before delayed payments (ACH and similar) clear, so fulfill only
  // when Stripe says the session is paid; async_payment_succeeded covers the delayed ones.
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object;
    if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return NextResponse.json({ received: true, pending: true });
    const email = s.customer_details?.email || s.customer_email;
    const course = s.metadata?.lmsCourse;
    if (email && course) await enrollInLms(email, course);

    // Labb Learning course purchase: create or find the learner and enroll them.
    if (s.metadata?.kind === "course" && email) {
      const c = await getCourse(s.metadata.course || "");
      if (c) await grantCourse({ email, name: s.metadata.name || "", course: c, source: "purchase", stripeSession: s.id, amountCents: s.amount_total ?? undefined });
    }

    // Sales quote: signed quote paid at checkout -> accepted and finalized.
    if (s.metadata?.kind === "sales-quote" && s.metadata.quoteId) {
      const { markPaid } = await import("@/lib/salesQuotes");
      if (s.subscription) {
        const sub = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
        const cust = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
        await sql()`update sales_quotes set stripe_subscription = ${sub}, stripe_customer = ${cust}, subscription_status = 'active' where id = ${s.metadata.quoteId}`;
      }
      await markPaid(s.metadata.quoteId, s.amount_total ?? 0, s.id);
    }

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
  // Quote software subscriptions: renewals, failed payments and cancellations.
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const inv = event.data.object as unknown as { subscription?: string | { id: string } | null; parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null; billing_reason?: string | null; amount_paid?: number; amount_due?: number };
    const raw = inv.subscription ?? inv.parent?.subscription_details?.subscription ?? null;
    const sub = typeof raw === "string" ? raw : raw?.id;
    if (sub) {
      const { quoteSubscriptionEvent } = await import("@/lib/salesQuotes");
      if (event.type === "invoice.payment_failed") await quoteSubscriptionEvent(sub, "failed", { cents: inv.amount_due ?? 0 });
      else if (inv.billing_reason === "subscription_cycle") await quoteSubscriptionEvent(sub, "renewed", { cents: inv.amount_paid ?? 0 });
    }
  }
  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as unknown as { id: string; status: string };
    const { quoteSubscriptionEvent } = await import("@/lib/salesQuotes");
    await quoteSubscriptionEvent(sub.id, event.type === "customer.subscription.deleted" ? "canceled" : "status", { status: sub.status });
  }
  return NextResponse.json({ received: true });
}
