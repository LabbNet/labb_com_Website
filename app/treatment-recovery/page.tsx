import type { Metadata } from "next";
import { SegmentPage } from "@/components/SegmentPage";

export const metadata: Metadata = {
  title: "Rapid Drug Testing for Treatment and Recovery Programs",
  description:
    "Objective, documented rapid urine drug testing for treatment and recovery programs, with FDA 510(k) cleared kits, a Labb Station read and lab confirmation in one button.",
  alternates: { canonical: "/treatment-recovery" },
};

export default function TreatmentRecovery() {
  return (
    <SegmentPage
      slug="treatment-recovery"
      crumb="Treatment and recovery"
      eyebrow="Treatment and recovery"
      title="Objective results that support recovery."
      lede="Rapid urine testing with FDA 510(k) cleared kits, an objective Labb Station read and a documented record for every test."
      primary={{ href: "#contact", label: "Request a consultation" }}
      secondary={{ href: "/labb-station", label: "About Labb Station" }}
      problem={{
        title: "Results that shape care have to be read the same way every time",
        body: (
          <p>
            In treatment, a test result affects the next conversation with a patient. A faint line read differently by different staff, or a
            result with no record behind it, makes that conversation harder. Anyone reading by eye is exposed to bias.
          </p>
        ),
      }}
      answer={{
        eyebrow: "Labb Station",
        title: "Consistent, documented testing",
        cards: [
          { t: "Objective read", b: "Every test is read the same way, with the image and the collection on file." },
          { t: "Confirmation when it matters", b: "Send a result to the lab with one button when it needs confirmation." },
          { t: "Cleared kits only", b: "Treatment programs use FDA 510(k) cleared urine kits, up to the 15 panel." },
        ],
        link: { href: "/labb-station", label: "See how Labb Station works" },
      }}
      kits={{
        title: "FDA 510(k) cleared urine kits",
        intro: "Kits for treatment programs are FDA 510(k) cleared (OTC or IVD) urine screens, up to 15 drugs.",
        slugs: ["ua-15a"],
      }}
      form={{ segment: "treatment", products: ["Labb Station", "Test kits"], heading: "Request a consultation", title: "Testing for your program", intro: "Tell us about your program and the patients you serve, and a Labb specialist will reach out.", submit: "Request a consultation" , variant: "quote" }}
    />
  );
}
