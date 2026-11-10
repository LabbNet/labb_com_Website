import type { Metadata } from "next";
import { CtaBand } from "@/components/ui";
import { library } from "@/lib/resources";
import { lmsUrl } from "@/lib/commerce";

// Access is enforced in proxy.ts (member cookie). This page is never cached or indexed.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Partner Library",
  robots: { index: false, follow: false },
};

export default function LibraryPage() {
  return (
    <>
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "start" }}>
            <div>
              <span className="eyebrow">Labb partners</span>
              <h1>Partner library</h1>
              <p className="lede">The current version of every guidebook, handbook, data sheet and drug profile. Please don&apos;t share the library outside your organization.</p>
            </div>
            <form action="/api/logout" method="post">
              <button className="btn btn-outline" type="submit">Sign out</button>
            </form>
          </div>
          <div className="grid g3" style={{ marginTop: 32 }}>
            {library.map((g) => (
              <div key={g.group} className="card top">
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
            {lmsUrl && (
              <div className="card top">
                <h2 style={{ fontSize: "1.2rem" }}>Certifications</h2>
                <p>Take your online certification courses and exams.</p>
                <a className="btn btn-primary" href={lmsUrl} style={{ marginTop: 16 }}>Open Labb Learning</a>
              </div>
            )}
          </div>
        </div>
      </section>
      <CtaBand title="Need something that isn't here?" body="Email info@labb.com and we'll send it over." href="/contact" label="Contact Labb" />
    </>
  );
}
