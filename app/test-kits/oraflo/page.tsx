import type { Metadata } from "next";
import { SeriesPage } from "@/components/SeriesPage";

export const metadata: Metadata = {
  title: "OraFlo Oral Fluid Drug Tests | Labb",
  description: "Labb OraFlo (ORF Series) oral fluid drug screens with masked drug names for donor privacy, read objectively with Labb Station.",
  alternates: { canonical: "/test-kits/oraflo" },
};

export default function OraFlo() {
  return (
    <SeriesPage
      slug="oraflo"
      name="OraFlo"
      series="ORF Series"
      title="OraFlo: private oral fluid screens."
      lede="OraFlo oral fluid screens with drug names masked on the device, read objectively with Labb Station."
      info={{
        title: "OraFlo oral fluid screens",
        body: <p>Drug names on the device are masked to protect donor privacy, and decoded privately by Labb Station. Built for workplace testing, in the office or at the clinic.</p>,
        points: ["Oral fluid, observed collection", "Masked drug names (True Privacy)", "Read with Labb Station", "Workplace (EUO)"],
      }}
    />
  );
}
