import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { readFlash, requireAdmin } from "@/lib/admin";
import { notifyAddresses } from "@/lib/leads";
import { mailProviders } from "@/lib/mail";
import { getQtPricing } from "@/lib/qtPricing";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  await requireAdmin("/admin/settings");
  const [emails, flash, pr] = await Promise.all([notifyAddresses(), readFlash(), getQtPricing()]);
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
              <p className="fine" style={{ margin: 0 }}>Total = screen fee + overnight shipping + proctoring. Same price at home or at a clinic. Changes apply to new orders right away.</p>
              <div className="price-grid">
                <label>Screen fee, lowest ($)<input name="screenMin" inputMode="decimal" defaultValue={d(pr.screenMinCents)} required /></label>
                <label>Screen fee, highest ($)<input name="screenMax" inputMode="decimal" defaultValue={d(pr.screenMaxCents)} required /></label>
                <label>Drugs included at the lowest fee<input name="included" inputMode="numeric" defaultValue={pr.includedDrugs} required /></label>
                <label>Each additional drug ($)<input name="perDrug" inputMode="decimal" defaultValue={d(pr.perDrugCents)} required /></label>
                <label>Overnight shipping ($)<input name="shipping" inputMode="decimal" defaultValue={d(pr.shippingCents)} required /></label>
                <label>Proctoring, non-observed ($)<input name="proctorNon" inputMode="decimal" defaultValue={d(pr.proctorNonObservedCents)} required /></label>
                <label>Proctoring, observed ($)<input name="proctorObs" inputMode="decimal" defaultValue={d(pr.proctorObservedCents)} required /></label>
              </div>
              <p className="fine" style={{ margin: 0 }}>
                Example: {pr.includedDrugs} drugs, non-observed = ${d(pr.screenMinCents)} + ${d(pr.shippingCents)} + ${d(pr.proctorNonObservedCents)} = ${d(pr.screenMinCents + pr.shippingCents + pr.proctorNonObservedCents)}.
                Largest panel, observed = ${d(pr.screenMaxCents + pr.shippingCents + pr.proctorObservedCents)}.
              </p>
              <button className="btn btn-primary" type="submit">Save pricing</button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
