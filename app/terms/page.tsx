import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/LegalDoc";

export const metadata: Metadata = {
  title: "Website Terms of Use",
  description: "Terms for using labb.com, Quick Test orders, Labb Learning, guidebooks, email and the Channel Partner Program member area.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return (
    <LegalDoc
      file="terms.md"
      title="Website terms of use"
      updated="November 21, 2026"
      crumbs={[{ name: "Terms", href: "/terms" }]}
      intro={<p>Using LabbHR or Labb Station for your organization? Those are covered by the <Link href="/terms/labbhr">LabbHR Terms of Service</Link>.</p>}
    />
  );
}
