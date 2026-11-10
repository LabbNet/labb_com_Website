import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Checks, Faq, LabbHR } from "@/components/ui";
import { CppApplication } from "@/components/CppApplication";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Labb Channel Partner Program for Clinics and Collection Sites",
  description:
    "Join the Labb Channel Partner Program. Clinics get the LabbHR platform, rapid test kits, reduced card processing rates, marketing support, handbooks and certifications, and commission on the employer accounts they serve.",
  alternates: { canonical: "/channel-partner-program" },
};

// Program details below reflect the November 2026 CPP agreement terms. Keep in step with the signed agreement.
const benefits = [
  {
    tag: "Platform",
    t: "Upgrade to LabbHR",
    b: (
      <>
        Members get the <LabbHR /> platform to read rapid tests digitally, document every result automatically and give employer clients a
        clean, auditable record. <LabbHR /> is available to clinics only through the CPP.
      </>
    ),
  },
  {
    tag: "Revenue",
    t: "Commission on Labb accounts",
    b: <>Labb invoices the employer directly and pays you a commission on the accounts you serve. No chasing invoices, no collections.</>,
  },
  {
    tag: "Savings",
    t: "Reduced card processing",
    b: <>A 1.75% member card processing rate through the Labb point of sale. Many clinics pay 2.99% to 3.65% today, depending on card type and how the card is entered.</>,
  },
  {
    tag: "Growth",
    t: "Marketing co-op programs",
    b: <>Optional co-op marketing, including email campaigns to construction, manufacturing and logistics employers, to add leads on top of your own outreach.</>,
  },
  {
    tag: "Support",
    t: "Business development support",
    b: <>Help with pricing, proposals and larger opportunities from the Labb team, plus weekly member meetings to share what&apos;s working.</>,
  },
  {
    tag: "Training",
    t: "Handbooks and certifications",
    b: <>Member access to the Clinic Owners Handbooks, industry guidebooks and Labb's paid online certification programs, with DOT certification being added.</>,
  },
  {
    tag: "Testing",
    t: "Bundled confirmations",
    b: <>On bundled testing programs, Labb covers lab confirmation costs for non-negative rates up to 5%.</>,
  },
  {
    tag: "Products",
    t: "Labb rapid test kits",
    b: <>Oral fluid and urine screens from 6 to 23 drugs, built to be read with Labb Station, with data sheets and package inserts for every kit.</>,
  },
];

const steps = [
  { t: "Apply", b: "Fill out the short application below. It tells us about your clinic, your services and who will sign." },
  { t: "Discovery call", b: "A Labb partner manager reviews your application and walks you through the program, pricing and your questions." },
  { t: "Sign the agreement", b: "We email the Channel Partner Program Agreement for electronic signature. Review it with your advisors before you sign." },
  { t: "Onboard", b: "We set up your LabbHR account, ship starter kits, give you library and certification access, and add you to member meetings." },
];

const faqs = [
  {
    q: "What does membership cost?",
    a: "Program fees are set out in the Channel Partner Program Agreement. Your partner manager will review them with you on the discovery call before anything is signed.",
  },
  {
    q: "Are there territories?",
    a: "No. The CPP has no assigned geographic territories. Accounts are matched by fit with the employer's needs.",
  },
  {
    q: "Who owns the employer accounts?",
    a: "Employer accounts are Labb accounts. Labb invoices the employer directly, and members are paid a commission on the accounts they serve, as set out in the agreement.",
  },
  {
    q: "What kinds of employers do members serve?",
    a: "The program focuses on construction, manufacturing, and logistics and warehousing employers that want fast, on-site or near-site rapid testing for company (non-DOT) programs.",
  },
  {
    q: "Can Labb help with compliance questions?",
    a: "Labb provides general compliance information through its handbooks and guidebooks, and helps with pricing. Labb doesn't give legal advice or account-specific compliance guidance. Members use their own attorneys or home office for those.",
  },
  {
    q: "What if I land a large account?",
    a: "Great. For any account over 500 tests a month, or several accounts closing at once, give Labb advance notice so kit supply is ready.",
  },
  {
    q: "Am I committed when I apply?",
    a: "No. Applying only starts the conversation. Membership begins when both you and Labb sign the agreement.",
  },
];

export default function CppPage() {
  return (
    <>
      <PageHero
        eyebrow="Labb Channel Partner Program"
        title={<>Grow your clinic with <LabbHR /> and employer accounts.</>}
        lede={<>The CPP gives independent clinics and collection sites the <LabbHR /> platform, Labb rapid testing, lower processing costs and the marketing support to win employer business.</>}
        primary={{ href: "#apply", label: "Apply to join" }}
        secondary={{ href: "#how", label: "How it works" }}
        image={{ src: "/img/clinic-owners-handbook.webp", alt: "Labb Clinic Owners Handbook for CPP members", w: 1400, h: 1263 }}
      />
      <Breadcrumbs items={[{ name: "Channel Partner Program", href: "/channel-partner-program" }]} />
      <section className="section tight">
        <div className="wrap">
          <Checks items={["Commission on the Labb accounts you serve", "1.75% member card processing rate", "Handbooks, guidebooks and certifications"]} />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Member benefits</span>
            <h2>What CPP members get</h2>
            <p className="intro">Everything below is included in, or available through, the Channel Partner Program Agreement.</p>
          </div>
          <div className="grid g4">
            {benefits.map((b) => (
              <div key={b.t} className="card top">
                <span className="eyebrow" style={{ marginBottom: 10, fontSize: "0.7rem" }}>{b.tag}</span>
                <h3>{b.t}</h3>
                <p>{b.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft" id="how">
        <div className="wrap">
          <span className="eyebrow">How to join</span>
          <h2>Four steps from application to your first account</h2>
          <ol className="grid g4" style={{ listStyle: "none", padding: 0, marginTop: 28 }}>
            {steps.map((s, i) => (
              <li key={s.t} className="card rail">
                <div className="icon-dot" aria-hidden="true">{i + 1}</div>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="apply">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div>
            <span className="eyebrow">Apply</span>
            <h2>Ready to join?</h2>
            <p className="intro" style={{ marginBottom: 24 }}>
              Apply below. Check the box to have the Channel Partner Program Agreement emailed to you for review and electronic
              signature after your discovery call.
            </p>
            <div className="banner-rule">Membership starts only when both you and Labb sign the Channel Partner Program Agreement.</div>
            <div style={{ marginTop: 36 }}>
              <h2 style={{ fontSize: "1.5rem" }}>Questions</h2>
              <Faq items={faqs} />
            </div>
          </div>
          <div className="hero-card">
            <CppApplication />
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap">
          <div>
            <h2>Talk to a partner manager first?</h2>
            <p>Call (877) 868-9967 or email info@labb.com and ask about the Channel Partner Program.</p>
          </div>
          <div className="btn-row" style={{ marginTop: 0 }}>
            <Link href="#apply" className="btn btn-primary">Apply to Join</Link>
            <a href="tel:+18778689967" className="btn btn-ghost">Call (877) 868-9967</a>
          </div>
        </div>
      </section>
    </>
  );
}
