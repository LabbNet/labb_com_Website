import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuidebookPicker } from "@/components/GuidebookPicker";
import { currentMember } from "@/lib/auth";
import { GUIDEBOOKS, GUIDEBOOKS_LIVE, LATEST_NOTE } from "@/lib/guidebooks";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Free drug testing guidebooks for clinics and employers",
  description: "Free Labb guidebooks for clinics, collection sites and employers: policy, law, collection, background screening and costs. Always the current edition on labb.com.",
  robots: GUIDEBOOKS_LIVE ? undefined : { index: false, follow: false },
};

export default async function Guidebooks() {
  const admin = (await currentMember())?.role === "admin";
  if (!GUIDEBOOKS_LIVE && !admin) notFound();
  return (
    <section className="section gb-page">
      <div className="wrap" style={{ maxWidth: 1040 }}>
        {!GUIDEBOOKS_LIVE && <p className="qp-staff qp-preview"><strong>Preview.</strong> This page isn&apos;t live. Only signed-in Labb admins can see it and use the form.</p>}
        <span className="eyebrow">Labb Guidebooks</span>
        <h1>Free guidebooks for clinics and employers</h1>
        <p className="lede">Practical training guides on drug testing law, policy, collection, background screening and costs, written by people who have run testing programs since 1997. Tell us who you are, pick your guidebooks, and we&apos;ll email you a link to read them on labb.com.</p>
        <div className="gb-latest"><strong>Always the current edition.</strong> {LATEST_NOTE}</div>
        <GuidebookPicker books={GUIDEBOOKS.map(({ slug, title, blurb, cover, for: f }) => ({ slug, title, blurb, cover, for: f }))} note={LATEST_NOTE} />
      </div>
    </section>
  );
}
