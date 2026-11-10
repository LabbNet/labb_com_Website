import Link from "next/link";
import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Thank You", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <section className="section">
      <div className="wrap center" style={{ maxWidth: 680 }}>
        <div className="done">
          <div className="ok" aria-hidden="true">✓</div>
          <h1 style={{ fontSize: "2.4rem" }}>Thanks. We&apos;ll be in touch.</h1>
          <p className="lede">A Labb specialist has your request and will reply shortly. Need it sooner? Call <a href={site.phoneHref}>{site.phone}</a>.</p>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <Link href="/resources" className="btn btn-primary">Browse free handbooks</Link>
            <Link href="/test-kits" className="btn btn-outline">See test kits</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
