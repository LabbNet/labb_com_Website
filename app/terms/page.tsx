import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Website Terms of Use",
  description: "Terms of use for labb.com.",
  alternates: { canonical: "/terms" },
};

// DRAFT for attorney review. Purchase, shipping and refund terms will be added when Stripe checkout launches.
export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Terms", href: "/terms" }]} />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="prose wrap">
          <h1>Website terms of use</h1>
          <p className="article-meta">Last updated: November 2026</p>
          <p>These terms apply to your use of labb.com, operated by {site.legalName}. By using the site you agree to them.</p>
          <h2>Information only</h2>
          <p>
            Content on this site, including handbooks, data sheets and articles, is general information. It is not legal or medical
            advice. Talk to your attorney about your testing policy. Product data sheets summarize the package insert, which is the
            official document for product performance.
          </p>
          <h2>Products and pricing</h2>
          <p>
            Labb products are sold by quote. Orders, pricing, shipping and returns are governed by your quote and account agreement.
            Labb rapid screens are not for DOT or other federally regulated testing.
          </p>
          <h2>Gated content and partner materials</h2>
          <p>
            Handbooks and partner library materials are for your organization&apos;s internal use. Don&apos;t share partner library
            materials or passwords outside your organization.
          </p>
          <h2>Intellectual property</h2>
          <p>Labb®, LabbHR, OraFlo and Labb Station are trademarks of Ramsey Diagnostics Corporation. Site content may not be reproduced without written permission.</p>
          <h2>Contact</h2>
          <p><a href={`mailto:${site.email}`}>{site.email}</a> · {site.phone}</p>
        </div>
      </section>
    </>
  );
}
