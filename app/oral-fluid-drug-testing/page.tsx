import type { Metadata } from "next";
import { SpecimenPage } from "@/components/SpecimenPage";

export const metadata: Metadata = {
  title: "Oral Fluid Drug Testing for the Workplace",
  description:
    "Rapid oral fluid (saliva) drug tests for employers. Observed collection anywhere, no restroom needed, results in 3 to 10 minutes and an objective digital read.",
  alternates: { canonical: "/oral-fluid-drug-testing" },
};

export default function Page() {
  return (
    <SpecimenPage
      specimen="Oral fluid"
      path="/oral-fluid-drug-testing"
      crumb="Oral fluid drug testing"
      eyebrow="Oral fluid drug testing"
      h1={<>Observed collection, anywhere. <span className="em">No restroom</span> required.</>}
      lede="Oral fluid screens are collected in plain view in a few minutes, are hard to tamper with and show recent use. A strong choice for post-accident, reasonable suspicion and on-site testing."
      image={{ src: "/img/oral-fluid-devices.webp", alt: "Labb OraFlo and eTest Swab oral fluid drug test devices", w: 1400, h: 867 }}
      checks={["Results in 3 to 10 minutes", "Detects recent use, within hours", "Masked drug names on OraFlo devices"]}
      benefits={[
        { t: "Observed collection", b: "The specimen is collected in plain view, which reduces the chance of substitution or tampering." },
        { t: "Ideal for post-accident", b: "Oral fluid detects recent use, generally hours to a few days, when timing matters most." },
        { t: "No special facilities", b: "No restroom, no temperature check. Collect at the office, the jobsite or the dock." },
        { t: "True Privacy", b: "OraFlo devices show codes instead of drug names, and the reader decodes them privately." },
        { t: "Digital documentation", b: "Every result is captured, time-stamped and stored electronically." },
        { t: "Alcohol option", b: "The OR:14A adds an alcohol pad to 13 drug tests from a single swab." },
      ]}
      faqs={[
        { q: "How long does oral fluid detect drugs?", a: "Oral fluid generally shows recent use, from minutes after use up to about one to three days depending on the drug. It will not catch use from further back the way a urine test can." },
        { q: "Is oral fluid testing accurate?", a: "Each Labb device lists its positive and negative agreement against GC/MS in the package insert and data sheet. A rapid screen is preliminary, so every non-negative is confirmed by a laboratory." },
        { q: "What does the donor need to do?", a: "The donor must not put anything in the mouth for 10 minutes before collection. The swab is placed between the cheek and gum until the saturation indicator changes color." },
      ]}
    />
  );
}
