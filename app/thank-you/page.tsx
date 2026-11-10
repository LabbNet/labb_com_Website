import Link from "next/link";
import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Thank You", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string; agreement?: string }> }) {
  const { type, agreement } = await searchParams;
  const cpp = type === "cpp";
  return (
    <section className="section">
      <div className="wrap center" style={{ maxWidth: 700 }}>
        <div className="done">
          <div className="ok" aria-hidden="true">✓</div>
          {cpp ? (
            <>
              <h1 style={{ fontSize: "2.4rem" }}>Application received.</h1>
              <p className="lede">
                Thanks for applying to the Labb Channel Partner Program. A partner manager will contact you to schedule a discovery call.
                {agreement === "1" && " After that call, we'll email the Channel Partner Program Agreement for you to review and sign electronically."}
              </p>
              <p>Questions in the meantime? Call <a href={site.phoneHref}>{site.phone}</a> or email <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
              <div className="btn-row" style={{ justifyContent: "center" }}>
                <Link href="/labbhr" className="btn btn-primary">Explore LabbHR</Link>
                <Link href="/test-kits" className="btn btn-outline">See test kits</Link>
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: "2.4rem" }}>Thanks. We&apos;ll be in touch.</h1>
              <p className="lede">A Labb specialist has your request and will reply shortly. Need it sooner? Call <a href={site.phoneHref}>{site.phone}</a>.</p>
              <div className="btn-row" style={{ justifyContent: "center" }}>
                <Link href="/resources" className="btn btn-primary">Browse free handbooks</Link>
                <Link href="/test-kits" className="btn btn-outline">See test kits</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
