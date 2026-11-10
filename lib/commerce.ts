// Phase 2 hooks: Stripe checkout and the Labb learning platform (LMS).
// Both are off until their environment variables are set, so the site ships without them.

import Stripe from "stripe";

export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
export const lmsUrl = process.env.NEXT_PUBLIC_LMS_URL || "";

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

// Products are priced in Stripe (Dashboard > Products). Reference them by Price ID here
// so the website never hardcodes amounts. Certifications are the first planned items.
export const catalog: Record<string, { name: string; priceEnv: string; lmsCourse?: string }> = {
  "cert-clinic-owners": { name: "LabbHR Clinic Owners Certification", priceEnv: "STRIPE_PRICE_CERT_CLINIC_OWNERS", lmsCourse: "clinic-owners" },
  "cert-construction": { name: "LabbHR Construction Screening Certification", priceEnv: "STRIPE_PRICE_CERT_CONSTRUCTION", lmsCourse: "construction" },
  "cert-manufacturing": { name: "LabbHR Manufacturing Screening Certification", priceEnv: "STRIPE_PRICE_CERT_MANUFACTURING", lmsCourse: "manufacturing" },
  "cert-logistics": { name: "LabbHR Logistics Screening Certification", priceEnv: "STRIPE_PRICE_CERT_LOGISTICS", lmsCourse: "logistics" },
  "cert-background": { name: "LabbHR Background Screening Certification", priceEnv: "STRIPE_PRICE_CERT_BACKGROUND", lmsCourse: "background-screening" },
  "cert-drug-testing-cost": { name: "LabbHR Drug Testing Cost Certification", priceEnv: "STRIPE_PRICE_CERT_COST", lmsCourse: "drug-testing-cost" },
};

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
