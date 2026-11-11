import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, LabbHR } from "@/components/ui";
import { CppNav } from "@/components/CppNav";
import { PageHero } from "@/components/PageHero";
import { steps } from "@/lib/cpp";

export const metadata: Metadata = {
  title: "Labb Channel Partner Program for Clinics and Collection Sites",
  description:
    "What the Labb Channel Partner Program is and how it works: independent clinics and collection sites partner with Labb to serve employer accounts with Labb technology, kits and marketing support.",
  alternates: { canonical: "/channel-partner-program" },
};

// Overview: what the CPP is and how it works. Benefits, costs and requirements live on Program Details.
export default function CppOverview() {
  return (
    <>
      <PageHero
        eyebrow="Channel Partner Program · Overview"
        title={<>Grow your clinic with Labb.</>}
        lede={<>The Channel Partner Program (CPP) partners Labb with independent clinics and collection sites to serve employer accounts with <LabbHR />, Labb rapid testing and Labb marketing support.</>}
        primary={{ href: "/channel-partner-program/get-started", label: "Get started" }}
        secondary={{ href: "/channel-partner-program/program-details", label: "Program details" }}
      />
      <Breadcrumbs items={[{ name: "Partner program", href: "/channel-partner-program" }]} />
      <CppNav current="/channel-partner-program" />

      <section className="section">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">What is the CPP</span>
            <h2>A partnership between Labb and independent clinics</h2>
            <p className="intro" style={{ marginBottom: 0 }}>
              Labb brings the technology, the kits and the employer marketing. CPP members bring local collection and service. Labb invoices
              the employer and pays members a commission on the accounts they serve.
            </p>
          </div>
          <div className="card rail">
            <h3>Who it&apos;s for</h3>
            <p>Independent clinics and collection sites that want to win more employer business without building the technology themselves.</p>
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <span className="eyebrow">How it works</span>
          <h2>From application to your first account</h2>
          <ol className="grid g4" style={{ listStyle: "none", padding: 0, marginTop: 28 }}>
            {steps.map((s, i) => (
              <li key={s.t} className="card rail">
                <div className="icon-dot" aria-hidden="true">{i + 1}</div>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </li>
            ))}
          </ol>
          <div className="btn-row">
            <Link href="/channel-partner-program/program-details" className="btn btn-outline-dark">Benefits, costs and requirements</Link>
            <Link href="/channel-partner-program/get-started" className="btn btn-primary">Get started</Link>
          </div>
        </div>
      </section>
    </>
  );
}
