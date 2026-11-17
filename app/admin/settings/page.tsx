import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { readFlash, requireAdmin } from "@/lib/admin";
import { notifyAddresses } from "@/lib/leads";
import { mailProviders } from "@/lib/mail";
import { getQtPricing } from "@/lib/qtPricing";
import { FALLBACK_KIT_CENTS, lowestKitCents } from "@/lib/quickTest";
import { publishedKits } from "@/lib/kits";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  await requireAdmin("/admin/settings");
  const [emails, flash, pr] = await Promise.all([notifyAddresses(), readFlash(), getQtPricing()]);
  const missing = publishedKits.filter((k) => !pr.kitCents[k.slug]).map((k) => k.code);
  const d = (c: number) => (c / 100).toFixed(2);
  const providers = mailProviders();

  return (
    <>
      <AdminBar title="Settings" current="/admin/settings" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <Flash flash={flash} />
          <div className="hero-card lead-actions">
            <form action="/api/admin/settings" method="post">
              <input type="hidden" name="action" value="notify" />
              <h3><label htmlFor="s-notify">New lead notification address</label></h3>
              <p className="fine" style={{ margin: 0 }}>Every new website lead is emailed here. Separate more than one address with commas.</p>
              <input id="s-notify" name="emails" defaultValue={emails.join(", ")} required maxLength={600} />
              <button className="btn btn-primary" type="submit">Save</button>
            </form>
            <form action="/api/admin/settings" method="post">
              <input type="hidden" name="action" value="test" />
              <button className="btn btn-outline-dark" type="submit">Send a test notification</button>
            </form>
            <p className="fine" style={{ margin: 0 }}>
              Email sending: {providers.length ? providers.join(", then ") : "not configured. Leads are still saved, but no notification email goes out until SENDGRID_API_KEY (or Google Workspace SMTP) is set on Render."}
            </p>
          </div>

          <div className="hero-card lead-actions" style={{ marginTop: 24 }} id="pricing">
            <form action="/api/admin/settings" method="post">
              <input type="hidden" name="action" value="pricing" />
              <h3>Quick Test pricing</h3>
              <p className="fine" style={{ margin: 0 }}>Total = kit price + shipping (the customer picks overnight, second day or ground) + proctoring. The kit price is the online sale price set for that kit in <a href="/admin/pricing#rapid-kits">CPP pricing</a>. Same price at home or at a clinic. Changes apply to new orders right away.</p>
              <div className="price-grid">
                <label>Overnight shipping ($)<input name="shipping" inputMode="decimal" defaultValue={d(pr.shippingCents)} required /></label>
                <label>Second day shipping ($)<input name="shipping2" inputMode="decimal" defaultValue={d(pr.shipping2DayCents)} required /></label>
                <label>Ground shipping ($)<input name="shippingGround" inputMode="decimal" defaultValue={d(pr.shippingGroundCents)} required /></label>
                <label>Proctoring, non-observed ($)<input name="proctorNon" inputMode="decimal" defaultValue={d(pr.proctorNonObservedCents)} required /></label>
                <label>Proctoring, observed ($)<input name="proctorObs" inputMode="decimal" defaultValue={d(pr.proctorObservedCents)} required /></label>
              </div>
              <p className="fine" style={{ margin: 0 }}>
                Example: lowest priced kit, non-observed, ground = ${d(lowestKitCents(pr))} + ${d(pr.shippingGroundCents)} + ${d(pr.proctorNonObservedCents)} = ${d(lowestKitCents(pr) + pr.shippingGroundCents + pr.proctorNonObservedCents)}.
                {missing.length > 0 && <> No online sale price yet for {missing.join(", ")}; those kits use ${d(FALLBACK_KIT_CENTS)} until one is set.</>}
              </p>
              <button className="btn btn-primary" type="submit">Save pricing</button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
