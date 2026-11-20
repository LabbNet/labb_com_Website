import type { Metadata } from "next";
import { SegmentPage } from "@/components/SegmentPage";
import { GraphicSlot } from "@/components/visual/GraphicSlot";

export const metadata: Metadata = {
  title: "Employer Drug Testing at a Clinic Near Your Locations",
  description:
    "Send employees to clinics near your sites that run Labb technology. One program across every location, results documented the same way, plus background checks and physicals when you need them.",
  alternates: { canonical: "/employers/clinic" },
};

export default function UseAClinic() {
  return (
    <SegmentPage
      slug="employers/clinic"
      crumb="Use a clinic"
      eyebrow="Employers: use a clinic"
      title={<>Send employees to a clinic.<br />We manage the program.</>}
      lede="Labb connects you with clinics near your locations that run Labb technology, and manages the program for you. One program across every site, with results documented the same way everywhere."
      primary={{ href: "#contact", label: "Find clinics near me" }}
      secondary={{ href: "#how", label: "How it works" }}
      problem={{
        eyebrow: "Why use a Labb clinic",
        title: "Every clinic tests a little differently. Your program shouldn't.",
        body: (
          <p>
            When each location uses a different collection site, you get different kits, different paperwork and results that arrive in
            different ways. Labb clinics use the same technology and the same documentation, so your program looks the same at every site.
          </p>
        ),
      }}
      pains={[
        "A different collection site and process at every location",
        "Results arriving by fax, phone or not at all",
        "No single view of testing across sites",
        "Separate vendors for drug tests, background checks and physicals",
      ]}
      extra={{
        eyebrow: "At the clinic",
        title: "The same technology at every clinic in the network",
        wide: true,
        body: (
          <div className="feature-split">
            <GraphicSlot src="/graphics/employers/employee-drug-testing-urgent-care-clinic.webp" alt="Labb Station on the testing counter at an urgent care clinic" label="Testing at a clinic" w={1000} h={700} sizes="(max-width: 860px) 100vw, 560px" className="photo" />
            <div>
              <p className="lede-sm">
                Labb clinics run Labb Station for rapid oral fluid and urine tests, with an objective digital read and electronic
                documentation. Your employees get a quick visit, and you get the result in minutes instead of days.
              </p>
              <ul className="checks">
                <li>Clinics in the Labb Channel Partner Program near your sites</li>
                <li>Rapid results, with lab confirmation for non-negatives</li>
                <li>Background checks and physicals available at many clinics</li>
                <li>One program and one point of contact across locations</li>
              </ul>
            </div>
          </div>
        ),
      }}
      answer={{
        eyebrow: "How it works",
        title: "A clinic network that runs like your own program",
        cards: [
          { t: "Tell us where your people are", b: "Share your locations and hiring volume, and Labb maps clinics in its network near each site." },
          { t: "Set your panels and rules", b: "Labb sets up your panels, testing reasons and reporting so every clinic follows the same program." },
          { t: "Send employees to the clinic", b: "Employees visit a nearby clinic for their test, with no special scheduling system to learn." },
          { t: "Get results in minutes", b: "Rapid tests are read objectively with Labb Station and the result is documented electronically." },
          { t: "Confirm non-negatives", b: "Non-negative screens go to the lab for confirmation and medical review without extra paperwork." },
          { t: "Add more when you need it", b: "Combine drug testing with background checks, physicals and other services in the same program." },
        ],
      }}
      faqs={[
        { q: "How do I find clinics near my locations?", a: "Send your locations through the form below. Labb matches them with clinics in its Channel Partner Program and sets up the program for you." },
        { q: "What if there's no Labb clinic near one of my sites?", a: "Labb can recommend in-house testing for that site, or work out another option. Your program stays in one place either way." },
        { q: "Can employees get a background check or physical at the same visit?", a: "Many Labb clinics offer background checks, physicals and other services alongside drug testing. Tell us what you need and we'll match clinics that offer it." },
        { q: "What about DOT-regulated employees?", a: "Labb rapid kits are for company (non-DOT) testing. Labb also offers lab-based testing, so regulated (DOT) and non-regulated employees can run through one program." },
      ]}
      form={{
        segment: "employer",
        products: ["Labb Station", "Test kits"],
        heading: "Get a quote",
        title: "Find clinics near your locations",
        intro: "Tell us where your employees work and how many you test, and we'll match clinics near each site and set up your program.",
        submit: "Find clinics",
        variant: "quote",
        note: "Your testing goals, our technology and support: Labb builds the program around your goals, adds background screening and physicals when you need them, and keeps it on track.",
      }}
    />
  );
}
