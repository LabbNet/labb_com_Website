import type { Metadata } from "next";
import { SegmentPage } from "@/components/SegmentPage";

export const metadata: Metadata = {
  title: "Software for Drug Testing Laboratories | LabbHR by Labb",
  description:
    "LabbHR gives drug testing laboratories sales, marketing, contracting and accounting in one platform, connected to collection sites, TPAs, MROs and employers through One by Labb.",
  alternates: { canonical: "/laboratories" },
};

export default function Laboratories() {
  return (
    <SegmentPage
      slug="laboratories"
      crumb="Laboratories"
      eyebrow="Laboratories"
      title="Connect with the sites and businesses that send you specimens."
      lede="LabbHR gives laboratories one platform to grow, connected to collection sites, TPAs, MROs and employers through One by Labb."
      primary={{ href: "#contact", label: "Request a demo" }}
      secondary={{ href: "/labbhr", label: "About LabbHR" }}
      problem={{
        title: "Volume depends on relationships you can't see",
        body: (
          <p>
            Specimens arrive from collection sites, TPAs and employers who each run their own tools. Selling to them, contracting with them
            and billing them happens across disconnected systems, and independent sites are hard to reach at all.
          </p>
        ),
      }}
      pains={[
        "Sales, contracts and billing in separate tools",
        "No easy way to reach independent collection sites",
        "Paper custody forms from sites that test rapid first",
      ]}
      answer={{
        eyebrow: "LabbHR and One by Labb",
        title: "One platform to grow, one network to grow in",
        cards: [
          { t: "Run the business", b: "Sales, marketing, contracting and accounting in one platform." },
          { t: "Join One by Labb", b: "Find and work with collection sites, TPAs, MROs and employers on the same network." },
          { t: "Electronic custody from rapid sites", b: "Sites on Labb send non-negatives and lab orders with an electronic chain of custody for rapid and non-regulated lab tests." },
        ],
        link: { href: "/one", label: "About One by Labb" },
      }}
      form={{ segment: "laboratory", products: ["LabbHR"], heading: "Request a demo", title: "See LabbHR for your laboratory", intro: "LabbHR is in beta now. Tell us about your lab and we'll show you the platform and the One by Labb network.", submit: "Request a Demo" }}
    />
  );
}
