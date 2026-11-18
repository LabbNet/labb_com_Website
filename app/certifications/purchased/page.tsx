import type { Metadata } from "next";
export const metadata: Metadata = { title: "Enrollment", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
import Link from "next/link";
import { stripe, stripeEnabled } from "@/lib/commerce";
import { getCourse, grantCourse } from "@/lib/courses";

// Stripe sends buyers here after paying. Enrollment also happens from the webhook; both are safe to repeat.
export default async function Purchased({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let ok = false, email = "";
  if (stripeEnabled && session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id)) {
    const s = await stripe().checkout.sessions.retrieve(session_id);
    const c = await getCourse(s.metadata?.course || "");
    email = s.customer_details?.email || s.customer_email || "";
    if (s.payment_status === "paid" && c && email) {
      await grantCourse({ email, name: s.metadata?.name || "", course: c, source: "purchase", stripeSession: s.id, amountCents: s.amount_total ?? undefined });
      ok = true;
    }
  }
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <h1>{ok ? "You're enrolled." : "We couldn't confirm your payment yet."}</h1>
        {ok ? (
          <p className="lede">We emailed {email} a link to set up your Labb account. If you already have one, sign in and open <Link href="/learn">My courses</Link>.</p>
        ) : (
          <p className="lede">If you completed checkout, your enrollment email is on its way. Questions? Call (877) 868-9967 or email info@labb.com.</p>
        )}
      </div>
    </section>
  );
}
