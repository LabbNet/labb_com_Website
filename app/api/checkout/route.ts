import { NextResponse } from "next/server";
import { catalog, stripe, stripeEnabled } from "@/lib/commerce";
import { absoluteUrl } from "@/lib/site";

// POST { sku } -> Stripe Checkout URL. Disabled (404) until STRIPE_SECRET_KEY is set.
export async function POST(req: Request) {
  if (!stripeEnabled) return NextResponse.json({ error: "Checkout is not available yet." }, { status: 404 });
  const { sku, email } = (await req.json().catch(() => ({}))) as { sku?: string; email?: string };
  const item = sku ? catalog[sku] : undefined;
  const price = item ? process.env[item.priceEnv] : undefined;
  if (!item || !price) return NextResponse.json({ error: "Unknown product." }, { status: 400 });

  // Stripe rejects malformed emails with an error, so only pass a plausible one (it asks for it otherwise).
  const customerEmail = typeof email === "string" && /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email.trim()) ? email.trim() : undefined;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    customer_email: customerEmail,
    allow_promotion_codes: true,
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    metadata: { sku: sku!, lmsCourse: item.lmsCourse || "" },
    success_url: absoluteUrl("/thank-you?type=purchase"),
    cancel_url: absoluteUrl("/certifications"),
  });
  return NextResponse.json({ url: session.url });
}
