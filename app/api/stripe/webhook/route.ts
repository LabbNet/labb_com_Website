import { NextResponse } from "next/server";
import { enrollInLms, stripe, stripeEnabled } from "@/lib/commerce";

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
  }
  return NextResponse.json({ received: true });
}
