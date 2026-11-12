// Phase 2 hooks: Stripe checkout and the Labb learning platform (LMS).
// Both are off until their environment variables are set, so the site ships without them.

import Stripe from "stripe";
import { certs } from "@/lib/certifications";
import { dbConfigured } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";
import type { Lead } from "@/lib/leads";

export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
export const lmsUrl = process.env.NEXT_PUBLIC_LMS_URL || "";

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

// Products are priced in Stripe (Dashboard > Products). Reference them by Price ID env var
// so the website never hardcodes amounts. Certifications are the first planned items.
export const catalog: Record<string, { name: string; priceEnv: string; lmsCourse?: string }> = Object.fromEntries(
  certs.map((c) => [c.sku, { name: `${c.name} Certification`, priceEnv: c.priceEnv, lmsCourse: c.lmsCourse }]),
);

// Called from the Stripe webhook after payment. Wire this to the LMS enrollment API.
export async function enrollInLms(email: string, course: string) {
  if (!process.env.LMS_API_URL || !process.env.LMS_API_KEY) {
    console.warn(`[lms] Not configured. Would enroll ${email} in ${course}`);
    return;
  }
  const res = await fetch(`${process.env.LMS_API_URL.replace(/\/$/, "")}/enrollments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.LMS_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, course }),
  });
  if (!res.ok) throw new Error(`LMS enrollment failed: ${res.status}`);
}

// ---- Quick Test (individual at-home or at-clinic test) ----
// One Stripe Price for both options (same price at home or at a clinic): STRIPE_PRICE_QUICK_TEST.
export const quickTestCheckoutReady = () => stripeEnabled && Boolean(process.env.STRIPE_PRICE_QUICK_TEST) && dbConfigured;

export async function quickTestCheckout(leadId: string, lead: Lead) {
  const home = lead.details?.fulfillment === "At home";
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: process.env.STRIPE_PRICE_QUICK_TEST!, quantity: 1 }],
    customer_email: lead.email,
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    metadata: { kind: "quick-test", leadId, fulfillment: lead.details?.fulfillment || "" },
    payment_intent_data: { description: `Labb Quick Test (${home ? "at home" : "at a clinic"}), order ${leadId}` },
    success_url: absoluteUrl("/thank-you?type=quick-test-paid"),
    cancel_url: absoluteUrl("/quick-test?canceled=1#order"),
  });
  return session.url!;
}

// Display price for the Quick Test page, read from Stripe (cached by the page's revalidate).
export async function quickTestPrice(): Promise<string | null> {
  if (!stripeEnabled || !process.env.STRIPE_PRICE_QUICK_TEST) return process.env.QUICK_TEST_PRICE_DISPLAY || null;
  try {
    const p = await stripe().prices.retrieve(process.env.STRIPE_PRICE_QUICK_TEST);
    if (p.unit_amount == null) return null;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency.toUpperCase() }).format(p.unit_amount / 100);
  } catch {
    return process.env.QUICK_TEST_PRICE_DISPLAY || null;
  }
}
