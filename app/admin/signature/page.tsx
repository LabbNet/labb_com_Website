import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { SignatureSettings } from "@/components/SignatureSettings";
import { readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

export const metadata: Metadata = { title: "My signature", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// An admin's saved signature, used to countersign agreements on quotes they're the rep on.
export default async function AdminSignature() {
  const me = await requireAdmin("/admin/signature");
  const [[sig], flash] = await Promise.all([
    sql()<{ signature_png: string | null; signature_name: string | null; signature_title: string | null; signature_at: Date | null; superadmin: boolean }[]>`select signature_png, signature_name, signature_title, signature_at, superadmin from members where id = ${me.id}`,
    readFlash(),
  ]);
  return (
    <>
      <AdminBar title="My signature" current="/admin/sales-quotes" />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <Flash flash={flash} />
          <div className="hero-card">
            <h1 style={{ fontSize: "1.7rem", margin: "0 0 6px" }}>My signature</h1>
            <p style={{ textAlign: "left", marginTop: 0 }}>When a client signs a quote you&apos;re the rep on, the agreement is countersigned for Labb with this signature, your name and title, and the date. {sig?.superadmin ? "As superadmin, your signature is also used on Labb quotes whose rep hasn't saved one." : ""}</p>
            <SignatureSettings back="/admin/signature" sig={{ ...sig, name: me.name }} />
          </div>
        </div>
      </section>
    </>
  );
}
