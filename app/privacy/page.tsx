import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Labb collects and uses information submitted through labb.com.",
  alternates: { canonical: "/privacy" },
};

// DRAFT for attorney review. Replaces the Shopify-generated policy, which referenced Shopify checkout.
export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Privacy policy", href: "/privacy" }]} />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="prose wrap">
          <h1>Privacy policy</h1>
          <p className="article-meta">Last updated: November 2026</p>
          <p>
            This policy explains how {site.legalName} (&quot;Labb&quot;) handles information collected through labb.com. It covers this
            website only. Drug test results and donor records processed in LabbHR are governed by your account agreement.
          </p>
          <h2>Information we collect</h2>
          <ul>
            <li><strong>Information you give us</strong> through our forms: name, work email, phone, company, state, testing volume and your message.</li>
            <li><strong>Usage information</strong> such as pages visited, referring site, campaign tags and device type, collected through cookies and analytics tools.</li>
            <li><strong>Access cookies</strong> that remember when you have unlocked a handbook or signed in to the partner library.</li>
          </ul>
          <h2>How we use it</h2>
          <ul>
            <li>To respond to your request, send the resource you asked for and follow up about your program.</li>
            <li>To send the Labb newsletter if you opted in. You can unsubscribe at any time.</li>
            <li>To connect you with a Labb Channel Partner clinic that can serve you.</li>
            <li>To improve the website and measure our marketing.</li>
          </ul>
          <h2>Sharing</h2>
          <p>
            We share information with service providers that help us run the website, deliver email and manage leads, and with Labb
            Channel Partner clinics when needed to serve your request. We do not sell personal information.
          </p>
          <h2 id="your-choices">Your choices</h2>
          <p>
            You can ask us to access, correct or delete your information, or to stop using it for marketing, by emailing{" "}
            <a href={`mailto:${site.email}`}>{site.email}</a>. To opt out of the sale or sharing of personal information, email us with
            the subject &quot;Do not sell or share.&quot; You can also block or delete cookies in your browser settings.
          </p>
          <h2>Contact</h2>
          <p>
            {site.legalName}, {site.address.street}, {site.address.city}, {site.address.region} {site.address.postal},{" "}
            <a href={`mailto:${site.email}`}>{site.email}</a>.
          </p>
        </div>
      </section>
    </>
  );
}
