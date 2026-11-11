import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { readFlash, requireAdmin } from "@/lib/admin";
import { notifyAddresses } from "@/lib/leads";
import { mailProviders } from "@/lib/mail";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  await requireAdmin("/admin/settings");
  const [emails, flash] = await Promise.all([notifyAddresses(), readFlash()]);
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
        </div>
      </section>
    </>
  );
}
