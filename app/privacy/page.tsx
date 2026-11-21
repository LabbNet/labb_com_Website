import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Labb collects, uses and shares information on labb.com and in the LabbHR and Labb Station platform.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <LegalDoc file="privacy.md" title="Privacy policy" updated="November 21, 2026" crumbs={[{ name: "Privacy", href: "/privacy" }]} />;
}
