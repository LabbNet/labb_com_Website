import Link from "next/link";
import type { Metadata } from "next";
import { SegmentPage } from "@/components/SegmentPage";
import { GraphicSlot } from "@/components/visual/GraphicSlot";
import Image from "next/image";
import { industries } from "@/lib/industries";
import { getResource } from "@/lib/resources";

// Free employer guidebooks shown in the industries section, in this order.
const GUIDES: { slug: string; who: string; name?: string }[] = [
  { slug: "employers-guidebook", who: "Any industry" },
  { slug: "construction-screening-guidebook", who: "Construction" },
  { slug: "manufacturing-screening-guidebook", who: "Manufacturing" },
  { slug: "logistics-screening-guidebook", who: "Logistics and warehousing" },
  { slug: "healthcare-screening-guidebook", who: "Healthcare", name: "Healthcare Employer Guidebook" },
  { slug: "hospitality-screening-guidebook", who: "Hospitality", name: "Hospitality Employer Guidebook" },
];

export const metadata: Metadata = {
  title: "Drug Testing for Employers: In Your Office or at a Clinic",
  description:
    "Run rapid drug tests in-house without the guesswork or the paperwork. Labb Station gives every test an objective read, and confirmation is one button. Construction, manufacturing and logistics.",
  alternates: { canonical: "/employers" },
};

export default function Employers() {
  return (
    <SegmentPage
      slug="employers"
      crumb="Employers"
      eyebrow="Employers testing in-house"
      title={<>Drug testing for your employees.<br />In your office or at a clinic.</>}
      lede="Test at your location, or send employees to a clinic. Either way, Labb runs the program with you."
      primary={{ href: "#contact", label: "Get a quote" }}
      secondary={{ href: "#in-house", label: "In-house or clinic?" }}
      pathsIntro={{
        eyebrow: "One system, two ways to test",
        title: "The same advanced technology at clinics and workplaces.",
        lede: "Test on site or send employees to a clinic. Either way, every test runs on Labb Station: guided collection, an objective digital read and results documented the same way.",
      }}
      paths={[
        {
          id: "in-house",
          eyebrow: "Test in-house",
          title: "Test at your location.",
          body: "Your team runs the test with Labb kits and the Labb Station app on a phone. Fast, private and documented.",
          points: ["Results in minutes, hire the same day", "Guided steps and an objective read", "Confirmation with one button"],
          graphic: <GraphicSlot src="/graphics/employers/in-house.webp" alt="A construction supervisor capturing an OraFlo oral fluid test with a phone on the job site" label="In-house testing" w={1000} h={700} sizes="520px" className="photo" />,
          cta: { topic: "Employer: test in-house", label: "Plan in-house testing" },
        },
        {
          id: "clinic",
          eyebrow: "Use a clinic",
          title: "Send employees to a clinic.",
          body: "Labb connects you with clinics near your locations that run Labb technology, and manages the program for you.",
          points: ["Clinics near your sites", "One program, one bill", "Results documented the same way everywhere"],
          graphic: <GraphicSlot src="/graphics/employers/clinic.webp" alt="Labb Station on the testing counter at an urgent care clinic" label="Testing at a clinic" w={1000} h={700} sizes="520px" className="photo" />,
          cta: { topic: "Employer: use a clinic", label: "Find clinics near me" },
        },
      ]}
      problem={{
        title: "In-house testing means reading, documenting, and confirming test kits correctly.",
        body: (
          <p>
            Low testing volume means staff never get good at reading kits. A test misread as positive can rule out a candidate who would
            have cleared confirmation, and hiring is hard enough already.
          </p>
        ),
      }}
      pains={[
        "Staff who rarely read tests misread them",
        "Good candidates lost to a misread result",
        "Confirming a non-negative feels like a paperwork project",
        "No one on staff knows the rules",
      ]}
      answer={{
        eyebrow: "Labb Station",
        title: "A guided process and an objective read",
        cards: [
          { t: "Guided, step by step", b: "Every user tests the same way, following the same steps on the same screen." },
          { t: "Objective read", b: "Labb Station reads the device the same way for every donor, with the image on file." },
          { t: "Confirmation in one button", b: "Send to Lab coordinates the order, the electronic custody form, the collection record and the MRO. You only package the specimen." },
          { t: "Protect your hiring", b: "Candidates misread as positive by eye are often cleared after confirmation. An objective read and easy confirmation keep good people in the pipeline." },
          { t: "A team that keeps you compliant", b: "Labb helps you set up the program and keep it running by the rules." },
          { t: "Or use a collection site", b: "Prefer not to test in-house? Labb kits and reads are available through collection sites too." },
        ],
        link: { href: "/labb-station", label: "See how Labb Station works" },
      }}
      extra={{
        eyebrow: "Free guidebooks",
        title: "Built for the industries that hire fast",
        wide: true,
        body: (
          <div id="industries">
            <div className="guide-intro">
              <p className="lede-sm">
                A testing program is only as good as the people running it. Labb&apos;s free screening guidebooks give your designated
                employer representative (DER) and HR team the program guidance and education they need to run testing with confidence:
                the laws that apply, how to write a fair policy, which panel and specimen to use, how collections and results work,
                what to do with a non-negative, and how to stay consistent and defensible.
              </p>
              <ul className="checks guide-points">
                <li>Written for DERs, HR and safety managers, not lawyers</li>
                <li>Industry editions built around your roles, risks and hiring pace</li>
                <li>Checklists, timelines and real-world case scenarios</li>
                <li>Chapter reviews to train new staff and check understanding</li>
              </ul>
            </div>
            <div className="guide-grid">
              {GUIDES.map(({ slug, who, name }) => {
                const r = getResource(slug);
                if (!r) return null;
                const ind = r.industry ? industries.find((i) => i.slug === r.industry) : undefined;
                return (
                  <article key={slug} className="guide-card">
                    <Link href={`/resources/${slug}`} className="guide-cover" aria-label={name ?? r.shortTitle}>
                      <Image src={r.cover} alt="" width={r.coverW} height={r.coverH} sizes="180px" />
                    </Link>
                    <div className="guide-body">
                      <span className="guide-who">{who}</span>
                      <h3><Link href={`/resources/${slug}`}>{name ?? r.shortTitle}</Link></h3>
                      <p className="guide-meta">{r.facts[0]}</p>
                      <div className="guide-links">
                        <Link href={`/resources/${slug}`}>Get the free guidebook</Link>
                        {ind && <Link href={`/industries/${ind.slug}`}>Industry page</Link>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="guide-more">
              Budgeting a program? Get the free <Link href="/resources/drug-testing-cost-guidebook">Drug Testing Cost Guidebook</Link>: positive rates by specimen, in-house versus lab pricing and budgeting tools.
            </p>
          </div>
        ),
      }}
      kits={{
        title: "Smaller workplace panels",
        intro: "Employment use only (EUO), OTC and IVD kits for pre-employment, random and post-accident testing.",
        slugs: ["or-06a-etest-swab", "orf-31c-oraflo", "ua-13a-svt", "ua-16c-svt"],
      }}
      form={{ segment: "employer", products: ["Labb Station", "Test kits"], heading: "Get a quote", title: "Start an in-house program", intro: "Tell us about your workforce and we'll recommend panels, send a free sample and get your team certified.", submit: "Request a consultation", variant: "quote" }}
    />
  );
}
