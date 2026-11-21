import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/LegalDoc";

export const metadata: Metadata = {
  title: "LabbHR Terms of Service",
  description: "Terms of Service for the Labb Station and LabbHR workplace screening and compliance platform, kits, devices and services.",
  alternates: { canonical: "/terms/labbhr" },
};

export default function Page() {
  return (
    <LegalDoc
      file="labbhr-terms.md"
      eyebrow="Ramsey Diagnostics Corporation d/b/a Labb"
      title="LabbHR Terms of Service"
      updated="September 10, 2026"
      crumbs={[{ name: "Terms", href: "/terms" }, { name: "LabbHR Terms of Service", href: "/terms/labbhr" }]}
      intro={<p>These terms govern Labb Station and LabbHR subscriptions and related products and services. See also our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Website Terms of Use</Link>.</p>}
    />
  );
}
