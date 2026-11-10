import type { Metadata } from "next";
import { Breadcrumbs, CtaBand, LabbHR } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { catalog } from "@/lib/commerce";

export const metadata: Metadata = {
  title: "LabbHR Drug and Background Screening Certifications",
  description:
    "Online LabbHR certifications for clinic owners, HR teams and collectors: construction, manufacturing, logistics, background screening and drug testing cost. Join the waitlist.",
  alternates: { canonical: "/certifications" },
};

export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Certifications", href: "/certifications" }]} />
      <section className="hero form-hero">
        <div className="wrap">
          <div>
            <span className="eyebrow">Online certification</span>
            <h1>Certify your team to run screening <span className="em">in-house</span>.</h1>
            <p className="lede">
              <LabbHR /> certifications pair Labb training documents with an online course and exam, so your collectors, HR team and
              program administrators can show they know the process.
            </p>
            <p><strong>Enrollment opens soon.</strong> Join the waitlist and we&apos;ll email you when it does.</p>
          </div>
          <div className="hero-card">
            <LeadForm variant="certification-waitlist" title="Join the waitlist" subtitle="Be first to know when enrollment opens." submitLabel="Join the Waitlist" />
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Programs</span>
          <h2>Certifications planned</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {Object.entries(catalog).map(([sku, c]) => (
              <div key={sku} className="card top">
                <h3>{c.name.replace("LabbHR ", "")}</h3>
                <p>Online course and exam, built on the matching Labb handbook.</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
