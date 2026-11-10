import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Partner Library Sign In",
  robots: { index: false, follow: false },
};

export default async function LibraryLogin({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/library", error } = await searchParams;
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 520 }}>
        <div className="hero-card">
          <span className="eyebrow">Labb partners</span>
          <h1 style={{ fontSize: "2rem" }}>Partner library</h1>
          <p className="form-sub">Guidebooks, handbooks, data sheets and drug profiles for Labb partners and clients.</p>
          <form action="/api/library-login" method="post">
            <input type="hidden" name="next" value={next} />
            <div className="field">
              <label htmlFor="pw">Library password</label>
              <input id="pw" name="password" type="password" required autoComplete="current-password" aria-invalid={error ? true : undefined} aria-describedby={error ? "pw-err" : undefined} />
              {error && <span className="err" id="pw-err">That password didn&apos;t work. Check it and try again.</span>}
            </div>
            <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} type="submit">Open the library</button>
          </form>
          <p className="fine">
            Need access? Email <a href="mailto:info@labb.com">info@labb.com</a>. Clinics can <Link href="/channel-partner-program">join the partner program</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
