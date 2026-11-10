import Image from "next/image";
import type { Metadata } from "next";
import { Breadcrumbs, Checks } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get a Quote or a Free Sample",
  description: "Request pricing or a free sample of Labb rapid drug test kits and the Labb Station reader. A Labb specialist will reply shortly.",
  alternates: { canonical: "/get-a-quote" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ sample?: string; kit?: string }> }) {
  const sp = await searchParams;
  const sample = sp.sample === "1";
  const kit = sp.kit?.replace(/[^A-Za-z0-9: ]/g, "").slice(0, 12);
  return (
    <>
      <Breadcrumbs items={[{ name: "Get a quote", href: "/get-a-quote" }]} />
      <section className="hero form-hero">
        <div className="wrap">
          <div>
            <span className="eyebrow">{sample ? "Free sample" : "Get a quote"}</span>
            <h1>{sample ? "Try a Labb rapid test, free." : "Pricing built around your program."}</h1>
            <p className="lede">
              Tell us about your testing and a Labb specialist will recommend a panel, send pricing for your volume and set up a sample
              kit with a live read on Labb Station.
            </p>
            <Checks items={["Panel recommendation for your policy and state", "Pricing for your monthly volume", "Free sample kit and a walkthrough"]} />
            <p style={{ marginTop: 28 }}>
              Prefer to talk? Call <a href={site.phoneHref}>{site.phone}</a>.
            </p>
            <Image src="/img/oraflo-devices.webp" alt="OraFlo oral fluid drug test devices" width={856} height={860} sizes="320px" style={{ maxWidth: 300, marginTop: 20 }} />
          </div>
          <div className="hero-card">
            <LeadForm variant={sample ? "sample" : "quote"} title={sample ? "Request a free sample" : kit ? `Request a quote for ${kit}` : "Request a quote"} submitLabel={sample ? "Request a Sample" : "Get a Quote"} defaultMessage={kit ? `I would like pricing for the ${kit}.` : undefined} />
          </div>
        </div>
      </section>
    </>
  );
}
