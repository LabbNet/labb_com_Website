import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="wrap center" style={{ maxWidth: 640 }}>
        <span className="eyebrow">Page not found</span>
        <h1 style={{ fontSize: "2.4rem" }}>We couldn&apos;t find that page.</h1>
        <p className="lede">It may have moved when we rebuilt labb.com. Try one of these instead.</p>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <Link href="/" className="btn btn-primary">Home</Link>
          <Link href="/test-kits" className="btn btn-outline">Test kits</Link>
          <Link href="/get-a-quote" className="btn btn-outline">Get a quote</Link>
        </div>
      </div>
    </section>
  );
}
