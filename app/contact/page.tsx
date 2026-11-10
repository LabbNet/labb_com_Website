import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Labb",
  description: "Contact Labb in Norfolk, Virginia. Call (877) 868-9967 or send a message about rapid drug testing, Labb Station, LabbHR or partnering.",
  alternates: { canonical: "/contact" },
};

export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Contact", href: "/contact" }]} />
      <section className="section" style={{ paddingTop: 40 }}>
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">Contact</span>
            <h1>Talk to Labb</h1>
            <p className="lede">Questions about rapid testing, Labb Station, LabbHR, an existing account or partnering? Send a message or give us a call.</p>
            <div className="card rail" style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: "1.1rem" }}>{site.legalName}</h2>
              <p>
                {site.address.street}, {site.address.city}, {site.address.region} {site.address.postal}
                <br />
                Phone: <a href={site.phoneHref}>{site.phone}</a>
                <br />
                Email: <a href={`mailto:${site.email}`}>{site.email}</a>
              </p>
            </div>
            <p style={{ marginTop: 20 }}>
              Existing clients: <a href={site.clientLogin} rel="nofollow">sign in to your account</a>.
            </p>
          </div>
          <div className="hero-card">
            <LeadForm variant="contact" title="Send a message" submitLabel="Send Message" />
          </div>
        </div>
      </section>
    </>
  );
}
