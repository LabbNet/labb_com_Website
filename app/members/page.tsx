import Link from "next/link";
import { Alert } from "@/components/AuthCard";
import { currentMember } from "@/lib/auth";
import { publishedKits } from "@/lib/kits";
import { library } from "@/lib/resources";
import { lmsUrl } from "@/lib/commerce";
import { site } from "@/lib/site";

export default async function MembersHome({ searchParams }: { searchParams: Promise<{ welcome?: string; reset?: string }> }) {
  const { welcome, reset } = await searchParams;
  const m = await currentMember();
  if (!m) return null; // layout redirects to sign in
  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        {welcome && <Alert kind="ok">Your account is set up. Welcome to the Labb Channel Partner Program.</Alert>}
        {reset && <Alert kind="ok">Your password has been changed.</Alert>}
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", marginTop: 12 }}>Welcome, {m.name.split(" ")[0]}.</h1>
        <p className="lede">The current version of every handbook, guidebook, data sheet and drug profile for Labb partners. Please don&apos;t share these files or your login outside your organization.</p>

        <div className="grid g3" style={{ marginTop: 32 }}>
          {library.map((g) => (
            <div key={g.group} className="card top" style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "4px solid var(--orange)" }}>
              <h2 style={{ fontSize: "1.2rem" }}>{g.group}</h2>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {g.items.map((i) => (
                  <li key={i.url} style={{ marginBottom: 8 }}>
                    <a href={i.url} target="_blank" rel="noopener">{i.title}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="card top" style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "4px solid var(--orange)" }}>
            <h2 style={{ fontSize: "1.2rem" }}>Product data sheets</h2>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {publishedKits.filter((k) => k.dataSheet).map((k) => (
                <li key={k.slug} style={{ marginBottom: 6 }}><a href={k.dataSheet} target="_blank" rel="noopener">{k.name}</a></li>
              ))}
            </ul>
          </div>
          <div className="card top" style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "4px solid var(--orange)" }}>
            <h2 style={{ fontSize: "1.2rem" }}>Certifications</h2>
            <p>Product, specimen, software and position certifications for you and your collectors.</p>
            <p style={{ marginTop: 12 }}>
              {lmsUrl ? <a className="btn btn-primary" href={lmsUrl}>Open Labb Learning</a> : <Link href="/certifications">See certifications</Link>}
            </p>
          </div>
          <div className="card top" style={{ background: "#fff", border: "1px solid var(--border)", borderTop: "4px solid var(--orange)" }}>
            <h2 style={{ fontSize: "1.2rem" }}>Member support</h2>
            <p>Pricing help, larger opportunities and program questions.</p>
            <p style={{ marginTop: 12 }}>
              <a href={site.phoneHref}>{site.phone}</a>
              <br />
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
            <p style={{ marginTop: 10, fontSize: "0.85rem" }}>Give Labb advance notice of any account over 500 tests a month.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
