import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { readFlash, requireAdmin } from "@/lib/admin";
import { admins, STAGES } from "@/lib/crm";
import { LEAD_SOURCES, SEGMENTS } from "@/lib/segments";

export const metadata: Metadata = { title: "Add a lead", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Labb admins add a lead by hand (phone calls, trade shows, referrals). It goes into Leads and the CRM like a web lead.
export default async function NewLead() {
  const me = await requireAdmin("/admin/leads/new");
  const [team, flash] = await Promise.all([admins(), readFlash()]);
  return (
    <>
      <AdminBar title="Add a lead" current="/admin/crm" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <p><Link href="/admin/crm">← CRM</Link></p>
          <Flash flash={flash} />
          <h1 style={{ fontSize: "1.8rem", margin: "0 0 6px" }}>Add a lead</h1>
          <p style={{ marginTop: 0 }}>For leads that came in by phone, email, a trade show or a referral. Nobody is emailed. The lead shows up in Leads and the CRM like a website lead.</p>
          <form className="hero-card nl-form" action="/api/admin/leads/new" method="post">
            <div className="nl-grid">
              <div className="field"><label htmlFor="firstName">First name</label><input id="firstName" name="firstName" autoComplete="off" /></div>
              <div className="field"><label htmlFor="lastName">Last name</label><input id="lastName" name="lastName" autoComplete="off" /></div>
              <div className="field"><label htmlFor="email">Email<span className="req">*</span></label><input id="email" name="email" type="email" required autoComplete="off" /></div>
              <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" autoComplete="off" /></div>
              <div className="field nl-wide"><label htmlFor="company">Company</label><input id="company" name="company" autoComplete="off" /></div>
              <div className="field"><label htmlFor="city">City</label><input id="city" name="city" autoComplete="off" /></div>
              <div className="field"><label htmlFor="state">State</label><input id="state" name="state" maxLength={40} autoComplete="off" /></div>
              <div className="field"><label htmlFor="segment">Type of business<span className="req">*</span></label>
                <select id="segment" name="segment" required defaultValue="">
                  <option value="" disabled>Choose one</option>
                  {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.short}</option>)}
                </select></div>
              <div className="field"><label htmlFor="source">Where the lead came from<span className="req">*</span></label>
                <select id="source" name="source" required defaultValue="">
                  <option value="" disabled>Choose one</option>
                  {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select></div>
              <div className="field"><label htmlFor="products">Interested in</label><input id="products" name="products" placeholder="Labb Station, LabbHR, OraFlo..." autoComplete="off" /></div>
              <div className="field"><label htmlFor="volume">Monthly test volume</label><input id="volume" name="volume" autoComplete="off" /></div>
              <div className="field nl-wide"><label htmlFor="message">Notes</label><textarea id="message" name="message" placeholder="What they need, what was discussed, next step" /></div>
              <div className="field"><label htmlFor="owner">Assign to</label>
                <select id="owner" name="owner" defaultValue={me.id}>
                  <option value="">Unassigned</option>
                  {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select></div>
              <div className="field"><label htmlFor="stage">Stage</label>
                <select id="stage" name="stage" defaultValue="new">
                  {STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></div>
              <div className="field"><label htmlFor="followUp">Follow up on</label><input id="followUp" name="followUp" type="date" /></div>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center" }}>
              <button className="btn btn-primary" type="submit">Add lead</button>
              <Link href="/admin/crm" className="fine">Cancel</Link>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
