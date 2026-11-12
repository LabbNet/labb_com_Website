import type { Metadata } from "next";
import { SeriesPage } from "@/components/SeriesPage";

export const metadata: Metadata = {
  title: "Oral eTest: eTest Swab Oral Fluid Drug Tests | Labb",
  description: "Labb Oral eTest (OR Series) eTest Swab oral fluid drug screens: observed collection, no restroom, read objectively with Labb Station. 6 and 13 drug panels.",
  alternates: { canonical: "/test-kits/oral-etest" },
};

export default function OralETest() {
  return (
    <SeriesPage
      slug="oral-etest"
      name="Oral eTest"
      series="OR Series"
      title="Oral eTest: oral fluid drug screens."
      lede="eTest Swab oral fluid screens for observed collection anywhere, read objectively with Labb Station."
      info={{
        title: "eTest Swab oral fluid screens",
        body: <p>Observed collection with no restroom needed. A two-sided cup designed for an objective Labb Station read, in the office or at the clinic.</p>,
        points: ["Oral fluid, observed collection", "Read in 3 to 10 minutes", "Two-sided cup built for Labb Station", "Employment use only (EUO)"],
      }}
    />
  );
}
