import { EMAIL_RE } from "@/lib/auth";
import { stripe, stripeEnabled } from "@/lib/commerce";
import { currentMember } from "@/lib/auth";
import { cppPriceCents, getCourse, isActiveCpp } from "@/lib/courses";
import { field, go } from "@/lib/http";
import { absoluteUrl } from "@/lib/site";

// Starts Stripe Checkout for a course. Until Stripe is set up, sends the buyer to request enrollment instead.
export async function POST(req: Request) {
  const fd = await req.formData();
  const c = await getCourse(field(fd, "course", 60));
  if (!c || !c.forSale || c.priceCents === null) return go(req, "/certifications");
  const name = field(fd, "name", 120);
  const email = field(fd, "email", 160).toLowerCase();
  const back = `/certifications/${c.slug}`;
  if (!name || !EMAIL_RE.test(email)) return go(req, `${back}?error=details#enroll`);
  if (!stripeEnabled) return go(req, `${back}?checkout=soon#enroll`);
  const cpp = await isActiveCpp(await currentMember());
  const discounted = cpp ? cppPriceCents(c) : null;
  const amount = discounted ?? c.priceCents;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: amount, product_data: { name: c.title, description: `${c.short}. Online course with chapter exams and a certificate of completion.${discounted !== null ? ` CPP member price (${c.cppDiscountPct}% off).` : ""}` } } }],
    metadata: { kind: "course", course: c.slug, name, cpp: discounted !== null ? "yes" : "no" },
    success_url: absoluteUrl(`/certifications/purchased?session_id={CHECKOUT_SESSION_ID}`),
    cancel_url: absoluteUrl(`${back}?checkout=cancelled#enroll`),
  });
  return Response.redirect(session.url!, 303);
}
