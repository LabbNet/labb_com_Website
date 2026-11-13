import Link from "next/link";
import type { Metadata } from "next";
import { SegmentPage } from "@/components/SegmentPage";

export const metadata: Metadata = {
  title: "Rapid Drug Test Documentation for Collection Sites",
  description:
    "Labb Station gives collection sites an objective read and a documented, court-ready record for every rapid drug test, plus Flex Testing custom panels and lab ordering in one system.",
  alternates: { canonical: "/collection-sites" },
};

export default function CollectionSites() {
  return (
    <SegmentPage
      slug="collection-sites"
      crumb="Collection sites"
      eyebrow="Collection sites and clinics"
      title="Every rapid result, documented and defensible."
      lede="Objective reads, a court-ready record and unlimited panel options for every client you serve."
      primary={{ href: "#contact", label: "Request a consultation" }}
      secondary={{ href: "/labb-station", label: "About Labb Station" }}
      problem={{
        title: "A rapid result with no proof is a liability",
        body: (
          <p>
            A result read by eye and written on a form can be questioned, and there is nothing to defend it with. Every Labb Station test
            leaves a documented record that protects an honest site, and the panels your clients ask for are built from the kits you already
            stock.
          </p>
        ),
      }}
      pains={[
        "Liability for rapid results with no proof",
        "Results questioned with nothing to defend them",
        "Clients asking for panels you do not stock",
        "Lab orders in a separate system",
      ]}
      answer={{
        eyebrow: "Labb Station",
        title: "How Labb Station protects your site",
        cards: [
          { t: "Objective read, documented", b: "Every rapid test gets the same objective digital read, with the image and the collection on file." },
          { t: "Flex Testing", b: "Remove any drug from a 23 panel cup to build a custom panel. One cup covers about 8.4 million combinations, so inventory shrinks." },
          { t: "Lab ordering built in", b: "Order lab tests and send non-negatives to the lab with one button, in the same system, with an electronic chain of custody." },
          { t: "Every client in one place", b: "A collector dashboard shows every client account, so each one gets the right panel and process." },
          { t: "A team behind you", b: "Labb helps set up your programs and keep your testing compliant." },
          { t: "Use the phones you have", b: "Read on the phones or tablets your collectors already use. No analyzer to buy." },
        ],
        link: { href: "/labb-station", label: "See everything in Labb Station" },
      }}
      extra={{
        eyebrow: "Ready to grow",
        title: "Test better with Labb Station, then grow with LabbHR",
        body: (
          <p>
            When you are ready to sell more programs, LabbHR adds sales, marketing, contracting and accounting to every Labb Station tool,
            and connects you to TPAs, labs, MROs and employers through One by Labb.
          </p>
        ),
        link: { href: "/compare", label: "Compare Labb Station and LabbHR" },
        side: { t: "Join the Channel Partner Program", b: <>Clinics can grow with Labb marketing programs and support. <Link href="/channel-partner-program">See CPP benefits</Link>.</> },
      }}
      kits={{
        title: "Recommended setup",
        intro: "A 23 panel urine cup with Flex Testing covers almost any client request, plus oral fluid for clients who want observed collections. Your end client decides which kit category applies.",
        slugs: ["ua-23a-svt", "or-14a-etest-swab", "orf-31c-oraflo", "or-06a-etest-swab"],
      }}
      faqs={[
        { q: "What does the electronic chain of custody cover?", a: "The Labb eCCF covers rapid urine, rapid oral fluid and non-regulated lab testing. DOT and other federally regulated collections use a paper chain of custody." },
        { q: "Do I need to buy a reader?", a: "No. Labb Station runs on the phones or tablets your collectors already use." },
        { q: "Can I build panels for each client?", a: "Yes. Flex Testing lets you remove any drug from a stocked panel to fit each client, and omitted drugs are not recorded or reported." },
      ]}
      form={{ segment: "collection-site", products: ["Labb Station"], heading: "Request a consultation", title: "Want Labb technology in your facility?", intro: "Tell us about your site and the clients you serve, and we'll show you Labb Station with your workflow in mind.", submit: "Request a consultation" }}
    />
  );
}
