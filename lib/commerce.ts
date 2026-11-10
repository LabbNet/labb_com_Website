// Phase 2 hooks: Stripe checkout and the Labb learning platform (LMS).
// Both are off until their environment variables are set, so the site ships without them.

import Stripe from "stripe";
import { certs } from "@/lib/certifications";

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
