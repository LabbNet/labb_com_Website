import type { Metadata } from "next";
import { SeriesPage } from "@/components/SeriesPage";

export const metadata: Metadata = {
  title: "Urine eTest: eTest Cup Urine Drug Tests | Labb",
  description: "Labb Urine eTest (UA Series) eTest Cup urine drug screens from 6 to 23 drugs, including ETG panels, read objectively with Labb Station.",
  alternates: { canonical: "/test-kits/urine-etest" },
};

export default function UrineETest() {
  return (
    <SeriesPage
      slug="urine-etest"
      name="Urine eTest"
      series="UA Series"
      title="Urine eTest: urine drug screens."
      lede="eTest Cup urine screens from 6 to 23 drugs, read objectively with Labb Station."
      info={{
        title: "eTest Cup urine screens",
        body: <p>Urine cups from 6 to 23 drugs, with workplace, OTC and forensic options. Flex Testing builds custom panels from the 23 panel cup.</p>,
        points: ["Urine, 6 to 23 drugs", "Workplace, OTC and forensic options", "ETG (alcohol) panels are forensic", "Flex Testing on the 23 panel"],
      }}
    />
  );
}
