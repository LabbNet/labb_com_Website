import Image from "next/image";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, CtaBand, LabbHR } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";

export const metadata: Metadata = {
  title: "For Clinics and Collection Sites: Labb Channel Partner Program",
  description:
    "Bring Labb rapid drug testing and the LabbHR platform into your clinic. Join the Labb Channel Partner Program for employer accounts, marketing support, guidebooks and certifications.",
  alternates: { canonical: "/for-clinics" },
};

const benefits = [
  { t: "LabbHR platform", b: "Read rapid tests digitally, document results automatically and give employer clients a clean record." },
  { t: "Marketing support", b: "Optional co-op marketing programs and business development support to win employer accounts." },
  { t: "Reduced card processing rates", b: "Member card processing rates below what most clinics pay today." },
  { t: "Guidebooks and certifications", b: "Member access to Labb handbooks, guidebooks and online certification programs for your team." },
  { t: "Commission on Labb accounts", b: "Labb invoices the employer directly and pays members a commission on the accounts they serve." },
  { t: "Weekly partner meetings", b: "Pricing help, best practices and updates from Labb and other members." },
];

export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ name: "For clinics", href: "/for-clinics" }]} />
      <section className="hero form-hero">
        <div className="wrap">
          <div>
            <span className="eyebrow">For clinics and collection sites</span>
            <h1>Add Labb rapid testing to your clinic, and grow with <span className="em">employer accounts</span>.</h1>
            <p className="lede">
              The Labb Channel Partner Program (CPP) gives independent clinics the <LabbHR /> platform, Labb rapid test kits and the
              support to serve employers who want testing done fast.
            </p>
            <Checks items={["Rapid oral fluid and urine kits read digitally", "Employer leads from Labb campaigns", "Training documents and online certification"]} />
            <Image src="/img/clinic-owners-handbook.webp" alt="Labb Clinic Owners Handbook" width={1400} height={1263} sizes="(max-width: 900px) 80vw, 420px" style={{ maxWidth: 420, marginTop: 28 }} />
          </div>
          <div className="hero-card" id="apply">
            <LeadForm variant="clinic" title="Talk to Labb about partnering" subtitle="Tell us about your clinic and a Labb partner manager will reach out." submitLabel="Request Partner Info" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Member benefits</span>
          <h2>What CPP members get</h2>
          <div className="grid g3" style={{ marginTop: 28 }}>
            {benefits.map((b) => (
              <div key={b.t} className="card top">
                <h3>{b.t}</h3>
                <p>{b.b}</p>
              </div>
            ))}
          </div>
          <p className="fine" style={{ textAlign: "left", marginTop: 24 }}>
            Program terms, rates and eligibility are set in the Channel Partner Program Agreement.
          </p>
        </div>
      </section>
      <CtaBand title="Ready to partner with Labb?" body="Request partner information and we'll walk you through the program." href="/for-clinics#apply" label="Request Partner Info" />
    </>
  );
}
