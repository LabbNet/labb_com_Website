import type { Metadata } from "next";
import { SegmentPage } from "@/components/SegmentPage";

export const metadata: Metadata = {
  title: "Software for Drug Testing TPAs | LabbHR by Labb",
  description:
    "LabbHR gives third party administrators one platform to sell, contract and bill drug testing programs, with background checks built in and collection sites, labs and MROs connected through One by Labb.",
  alternates: { canonical: "/tpas" },
};

export default function TPAs() {
  return (
    <SegmentPage
      slug="tpas"
      crumb="TPAs"
      eyebrow="Third party administrators"
      title="Sell, contract and bill programs on one platform."
      lede="LabbHR gives TPAs the tools to grow, with background checks built in and collection sites, labs and MROs connected through One by Labb."
      primary={{ href: "#contact", label: "Request a demo" }}
      secondary={{ href: "/labbhr", label: "About LabbHR" }}
      problem={{
        title: "Programs run across too many disconnected tools",
        body: (
          <p>
            Selling a program, contracting the client, finding collection sites, coordinating labs and MROs, and billing at the end usually
            means a different system for each step. Independent TPAs feel it most as roll-ups compete for the same clients.
          </p>
        ),
      }}
      pains={[
        "Sales, contracts and billing in separate tools",
        "Finding and managing collection sites client by client",
        "Background checks ordered somewhere else",
        "Competing with roll-ups on technology",
      ]}
      answer={{
        eyebrow: "LabbHR",
        title: "Stay independent and grow",
        cards: [
          { t: "Run the business", b: "Sales, marketing, contracting and accounting in one platform." },
          { t: "Background checks built in", b: "Order background checks in the same platform as drug testing." },
          { t: "Objective rapid reads", b: "Every Labb Station tool is included, so clients who test rapid get an objective, documented read." },
          { t: "Connected through One by Labb", b: "Work with collection sites, labs, MROs and employers on one network." },
          { t: "Electronic chain of custody", b: "An eCCF for rapid urine, rapid oral fluid and non-regulated lab tests, so programs run paperless." },
          { t: "Flex Testing", b: "Build custom rapid and lab panels for each client from one kit." },
        ],
        link: { href: "/compare", label: "Compare Labb Station and LabbHR" },
      }}
      form={{ segment: "tpa", products: ["LabbHR"], heading: "Request a demo", title: "See LabbHR for your TPA", intro: "LabbHR is in beta now. Tell us about your programs and we'll show you the platform and set up access.", submit: "Request a Demo" }}
    />
  );
}
