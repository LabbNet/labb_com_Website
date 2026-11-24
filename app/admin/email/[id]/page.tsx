import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBar, Flash } from "@/components/AdminBar";
import { EmailCompose } from "@/components/EmailCompose";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { AUDIENCES, audienceCounts, buildHtml, getCampaign } from "@/lib/broadcast";
import { bounces, campaignStats, clickers, pct, topLinks } from "@/lib/emailStats";

export const metadata: Metadata = { title: "Email", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EmailDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin("/admin/email");
  const c = await getCampaign((await params).id);
  if (!c) notFound();
  const [counts, flash] = await Promise.all([audienceCounts(), readFlash()]);
  const n = counts[c.audience];
  const preview = buildHtml(c, "#unsubscribe");
  const draft = c.status === "draft";

  return (
    <>
      <AdminBar title="Email" current="/admin/email" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <p><Link href="/admin/email">All emails</Link></p>
          <Flash flash={flash} />
          <h1 style={{ fontSize: "1.8rem", margin: "0 0 6px" }}>{c.subject}</h1>
          <p className="fine" style={{ marginTop: 0 }}>
            To {AUDIENCES[c.audience].label} ·{" "}
            {draft ? `Draft by ${c.created_name ?? "admin"}, ${fmtDate(c.created_at)}` : `${c.status === "failed" ? "Failed" : "Sent"} ${fmtDate(c.sent_at)} by ${c.sent_name ?? "admin"}: ${c.sent} of ${c.recipients} delivered to SendGrid${c.failed ? `, ${c.failed} failed` : ""}`}
          </p>
          {c.error && <div className="form-error">{c.error}</div>}
          {!draft && c.sent > 0 && <CampaignReport id={c.id} sent={c.sent} />}

          <div className="email-grid">
            <div>
              <h2 style={{ fontSize: "1.3rem", marginTop: 8 }}>Preview</h2>
              {c.preheader && <p className="fine">Preview text: {c.preheader}</p>}
              <iframe title="Email preview" className="email-preview" sandbox="" srcDoc={preview} />
            </div>
            <aside>
              <div className="email-box">
                <h3>Send a test</h3>
                <form action="/api/admin/email" method="post" className="row-form">
                  <input type="hidden" name="action" value="test" />
                  <input type="hidden" name="id" value={c.id} />
                  <input name="to" type="email" required defaultValue={admin.email} aria-label="Test email address" />
                  <button className="btn btn-outline" type="submit">Send test</button>
                </form>
              </div>
              {draft ? (
                <div className="email-box send">
                  <h3>Send to {n} {AUDIENCES[c.audience].label}</h3>
                  <form action="/api/admin/email" method="post">
                    <input type="hidden" name="action" value="send" />
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="count" value={n} />
                    <label className="check"><input type="checkbox" name="confirm" required /> I checked the test email. Send it to {n} {n === 1 ? "person" : "people"} now.</label>
                    <button className="btn btn-primary btn-block" type="submit" disabled={!n} style={{ marginTop: 12 }}>Send now</button>
                  </form>
                  <p className="fine">This can&apos;t be undone.</p>
                </div>
              ) : null}
              <div className="email-box">
                <form action="/api/admin/email" method="post" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="btn btn-outline" type="submit" name="action" value="duplicate">Duplicate</button>
                  {draft && <button className="btn btn-outline danger" type="submit" name="action" value="delete">Delete draft</button>}
                </form>
              </div>
            </aside>
          </div>

          {draft && (
            <div style={{ marginTop: 36 }}>
              <h2 style={{ fontSize: "1.3rem" }}>Edit</h2>
              <EmailCompose c={c} counts={counts} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// Delivery, opens, clicks and bounces for a sent email, from the SendGrid Event Webhook.
async function CampaignReport({ id, sent }: { id: string; sent: number }) {
  const [st, links, people, bad] = await Promise.all([campaignStats([id]), topLinks(id), clickers(id), bounces(id)]);
  const s = st[id];
  const base = s?.delivered || sent;
  const card = (label: string, value: string, sub?: string) => (
    <div className="em-card"><span>{label}</span><strong>{value}</strong>{sub && <em>{sub}</em>}</div>
  );
  return (
    <div className="em-report">
      <div className="em-cards">
        {card("Sent", String(sent))}
        {card("Delivered", s ? String(s.delivered) : "-", s ? pct(s.delivered, sent) : undefined)}
        {card("Opened", s ? String(s.opened) : "-", s ? `${pct(s.opened, base)} · ${s.opens} opens` : undefined)}
        {card("Clicked", s ? String(s.clicked) : "-", s ? `${pct(s.clicked, base)} · ${s.clicks} clicks` : undefined)}
        {card("Bounced", s ? String(s.bounced) : "-", s ? pct(s.bounced, sent) : undefined)}
        {card("Spam reports", s ? String(s.spam) : "-")}
      </div>
      {!s && <p className="fine" style={{ textAlign: "left" }}>No tracking data yet. It appears once the SendGrid Event Webhook is set up (see <Link href="/admin/email/analytics">Email analytics</Link>) and people open the email.</p>}
      {s && <p className="fine" style={{ textAlign: "left" }}>Unique people. Opened and clicked are out of delivered emails. Some email apps (Apple Mail) open images automatically, so the open rate runs high; clicks are the more reliable measure.</p>}
      {links.length > 0 && (
        <details className="em-details" open>
          <summary>Links clicked</summary>
          <table className="meet-table"><thead><tr><th>Link</th><th>People</th><th>Clicks</th></tr></thead>
            <tbody>{links.map((l) => <tr key={l.url}><td style={{ wordBreak: "break-all" }}><a href={l.url} target="_blank" rel="noreferrer">{l.url.replace(/^https?:\/\/(www\.)?/, "").replace(/[?&]lk=[^&]+/, "").slice(0, 90)}</a></td><td>{l.people}</td><td>{l.clicks}</td></tr>)}</tbody>
          </table>
        </details>
      )}
      {people.length > 0 && (
        <details className="em-details">
          <summary>Who clicked ({people.length})</summary>
          <table className="meet-table"><thead><tr><th>Person</th><th>Company</th><th>Clicks</th><th>Last click</th></tr></thead>
            <tbody>{people.map((p) => <tr key={p.email}><td>{p.lead_id ? <Link href={`/admin/leads/${p.lead_id}`}>{p.name || p.email}</Link> : <Link href={`/admin/crm/p/${encodeURIComponent(p.email)}`}>{p.name || p.email}</Link>}{p.name && <span className="fine"> {p.email}</span>}</td><td>{p.company}</td><td>{p.clicks}</td><td className="fine">{fmtDate(p.last)}</td></tr>)}</tbody>
          </table>
        </details>
      )}
      {bad.length > 0 && (
        <details className="em-details">
          <summary>Bounced and spam reports ({bad.length})</summary>
          <p className="fine" style={{ textAlign: "left" }}>These addresses were added to Do not send automatically.</p>
          <table className="meet-table"><thead><tr><th>Address</th><th>What happened</th><th>Reason</th></tr></thead>
            <tbody>{bad.map((b) => <tr key={b.email}><td>{b.email}</td><td>{b.event === "spamreport" ? "Marked as spam" : b.event === "dropped" ? "Not delivered" : "Bounced"}</td><td className="fine">{b.reason}</td></tr>)}</tbody>
          </table>
        </details>
      )}
    </div>
  );
}
