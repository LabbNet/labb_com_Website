import type { Metadata } from "next";
import Link from "next/link";
import { AUDIENCES, checkUnsub, isAudience } from "@/lib/broadcast";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string; a?: string; t?: string; done?: string }> }) {
  const { e = "", a = "", t = "", done } = await searchParams;
  const valid = checkUnsub(e, a, t);
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 620 }}>
        <span className="eyebrow">Email preferences</span>
        {done === "1" ? (
          <>
            <h1>You&apos;re unsubscribed</h1>
            <p className="lede">You won&apos;t get these emails from Labb anymore. Changed your mind? Email <a href="mailto:info@labb.com">info@labb.com</a>.</p>
          </>
        ) : done === "0" || !valid || !isAudience(a) ? (
          <>
            <h1>This link didn&apos;t work</h1>
            <p className="lede">Email <a href="mailto:info@labb.com">info@labb.com</a> and we&apos;ll take you off the list.</p>
          </>
        ) : (
          <>
            <h1>Unsubscribe</h1>
            <p className="lede">Stop sending emails to <strong>{e}</strong> for <strong>{AUDIENCES[a].label.toLowerCase()}</strong>?</p>
            {a === "cpp" && <p>You&apos;ll still get account emails, such as password resets and leads sent to you.</p>}
            <form action="/api/email/unsubscribe" method="post" style={{ marginTop: 20 }}>
              <input type="hidden" name="e" value={e} />
              <input type="hidden" name="a" value={a} />
              <input type="hidden" name="t" value={t} />
              <input type="hidden" name="from" value="page" />
              <button className="btn btn-primary" type="submit">Unsubscribe</button>
            </form>
          </>
        )}
        <p style={{ marginTop: 28 }}><Link href="/">Back to labb.com</Link></p>
      </div>
    </section>
  );
}
