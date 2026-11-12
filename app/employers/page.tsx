import Link from "next/link";
import type { Metadata } from "next";
import { SegmentPage } from "@/components/SegmentPage";
import { industries } from "@/lib/industries";

export const metadata: Metadata = {
  title: "In-House Drug Testing for Employers | Labb",
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
      title="In-house drug testing without the guesswork or the paperwork."
      lede="Faster and less expensive than sending employees out, without the mistakes that come with reading tests yourself. In your office, or at a collection site near you."
      primary={{ href: "#contact", label: "Get a quote" }}
      secondary={{ href: "#industries", label: "Find your industry" }}
      problem={{
        title: "Reading tests yourself is where programs go wrong",
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
        eyebrow: "Your industry",
        title: "Built for the industries that hire fast",
        body: (
          <div id="industries">
            <p style={{ marginBottom: 12 }}>Free screening handbooks and industry pages for:</p>
            <ul className="checks">
              {industries.map((i) => <li key={i.slug}><Link href={`/industries/${i.slug}`}>{i.name}</Link></li>)}
            </ul>
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
