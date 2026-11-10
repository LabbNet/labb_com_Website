import type { Metadata } from "next";
import { SpecimenPage } from "@/components/SpecimenPage";

export const metadata: Metadata = {
  title: "Rapid Urine Drug Test Cups for Employers",
  description:
    "Labb eTest Cup rapid urine drug screens from 6 to 23 drugs with specimen validity testing. Results in 5 minutes, read digitally with Labb Station.",
  alternates: { canonical: "/urine-drug-testing" },
};

export default function Page() {
  return (
    <SpecimenPage
      specimen="Urine"
      path="/urine-drug-testing"
      crumb="Urine drug testing"
      eyebrow="Urine drug testing"
      h1={<>Wide panels, longer detection, results in <span className="em">5 minutes</span>.</>}
      lede="Labb eTest Cups cover 6 to 23 drugs with built-in specimen validity checks. A strong choice for pre-employment and random testing."
      image={{ src: "/img/true-privacy-screens.webp", alt: "Labb eTest Cup urine drug screen and OraFlo oral fluid device", w: 1400, h: 1400 }}
      checks={["Panels from 6 to 23 drugs", "Specimen validity pads on SVT cups", "Fentanyl, xylazine and kratom options"]}
      benefits={[
        { t: "Longer detection window", b: "Urine shows use over days, which suits pre-employment and random programs." },
        { t: "Specimen validity built in", b: "SVT cups check oxidants, specific gravity and pH, and the UA:23A adds nitrite, glutaraldehyde and creatinine." },
        { t: "Panels for every policy", b: "From the six drugs most often tested at work to a 23 drug forensic panel with EtG alcohol." },
        { t: "Read side by side", b: "The reader scans each side of the cup in order, so wide panels are read the same way every time." },
        { t: "Temperature strip", b: "Every cup has a temperature strip to check the specimen within four minutes." },
        { t: "Digital documentation", b: "Every result is captured, time-stamped and stored electronically." },
      ]}
      faqs={[
        { q: "How long does a urine drug test detect drugs?", a: "It depends on the drug and the person. Most drugs are detectable for one to several days, and marijuana can be detected longer in frequent users." },
        { q: "What is a specimen validity test (SVT)?", a: "Validity pads check whether the sample is real, undiluted urine. If any pad is abnormal, the drug strips are not read and the program follows its policy for a recollection." },
        { q: "Which cup should we choose?", a: "Many employers use the UA:06B or UA:13A for pre-employment and the UA:16C for a DOT look-alike company screen. Forensic programs often choose the UA:18C or UA:23A." },
      ]}
    />
  );
}
