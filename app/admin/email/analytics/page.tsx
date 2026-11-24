import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar } from "@/components/AdminBar";
import { fmtDate, requireAdmin } from "@/lib/admin";
import { AUDIENCES, type Campaign } from "@/lib/broadcast";
import { sql } from "@/lib/db";
import { campaignStats, lastEventAt, pct, sequenceStats, webhookUrl } from "@/lib/emailStats";
import { sequenceName } from "@/lib/sequences";

export const metadata: Metadata = { title: "Email analytics", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Sent, delivered, opened, clicked and bounced for every email and guidebook series step.
export default async function EmailAnalytics() {
  await requireAdmin("/admin/email/analytics");
  const db = sql();
  const [list, seq, last] = await Promise.all([
    db<Campaign[]>`select id, audience, subject, status, recipients, sent, failed, sent_at, created_at from email_campaigns where status <> 'draft' and sent > 0 order by sent_at desc nulls last limit 100`,
    sequenceStats(90),
    lastEventAt(),
  ]);
  const stats = await campaignStats(list.map((c) => c.id));
  const tot = list.reduce((a, c) => {
    const s = stats[c.id];
    a.sent += c.sent; a.delivered += s?.delivered || 0; a.opened += s?.opened || 0; a.clicked += s?.clicked || 0; a.bounced += s?.bounced || 0;
    return a;
  }, { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 });
  const best = list.filter((c) => stats[c.id]?.delivered >= 20).sort((a, b) => stats[b.id].clicked / stats[b.id].delivered - stats[a.id].clicked / stats[a.id].delivered).slice(0, 5);

  return (
    <>
      <AdminBar title="Email analytics" current="/admin/email" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <p><Link href="/admin/email">← Email</Link></p>
          <h1 style={{ fontSize: "1.8rem", margin: "0 0 6px" }}>Email analytics</h1>
          <p style={{ marginTop: 0 }}>Delivery, opens, clicks and bounces for every email and guidebook email. Bounces and spam reports go on Do not send automatically.</p>

          {!last && (
            <div className="hero-card em-setup">
              <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>One-time setup in SendGrid</h2>
              <ol>
                <li>In SendGrid, open <strong>Settings → Mail Settings → Event Webhook</strong> and create a webhook.</li>
                <li>Paste this address as the <strong>Post URL</strong>:<input readOnly className="copy-link" value={webhookUrl()} aria-label="Webhook address" /></li>
                <li>Select these events: <strong>Delivered, Opened, Clicked, Bounced, Dropped, Spam Reports</strong>. Turn the webhook on and save.</li>
                <li>Open and click tracking is turned on for each Labb email automatically.</li>
              </ol>
              <p className="fine" style={{ textAlign: "left", marginBottom: 0 }}>Numbers start with emails sent after the webhook is on. Keep the address private; it lets SendGrid post events to labb.com.</p>
            </div>
          )}
          {last && <p className="fine" style={{ textAlign: "left" }}>Last event received {fmtDate(last)} ET.</p>}

          <div className="em-cards" style={{ margin: "18px 0 28px" }}>
            <div className="em-card"><span>Sent</span><strong>{tot.sent.toLocaleString()}</strong><em>{list.length} emails</em></div>
            <div className="em-card"><span>Delivered</span><strong>{tot.delivered.toLocaleString()}</strong><em>{pct(tot.delivered, tot.sent)}</em></div>
            <div className="em-card"><span>Opened</span><strong>{tot.opened.toLocaleString()}</strong><em>{pct(tot.opened, tot.delivered)}</em></div>
            <div className="em-card"><span>Clicked</span><strong>{tot.clicked.toLocaleString()}</strong><em>{pct(tot.clicked, tot.delivered)}</em></div>
            <div className="em-card"><span>Bounced</span><strong>{tot.bounced.toLocaleString()}</strong><em>{pct(tot.bounced, tot.sent)}</em></div>
          </div>

          {best.length > 0 && (
            <>
              <h2 style={{ fontSize: "1.3rem" }}>What worked best</h2>
              <p className="fine" style={{ textAlign: "left", marginTop: 0 }}>Highest click rates (emails delivered to at least 20 people). Use these subjects and topics as models.</p>
              <ol className="em-best">{best.map((c) => <li key={c.id}><Link href={`/admin/email/${c.id}`}>{c.subject}</Link> <span className="fine">· {AUDIENCES[c.audience].label} · clicked {pct(stats[c.id].clicked, stats[c.id].delivered)} · opened {pct(stats[c.id].opened, stats[c.id].delivered)}</span></li>)}</ol>
            </>
          )}

          <h2 style={{ fontSize: "1.3rem", marginTop: 28 }}>Emails</h2>
          <div className="hero-card" style={{ overflowX: "auto" }}>
            <table className="meet-table">
              <thead><tr><th>Email</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Clicked</th><th>Bounced</th><th>Spam</th></tr></thead>
              <tbody>
                {!list.length && <tr><td colSpan={7}>No emails sent yet.</td></tr>}
                {list.map((c) => {
                  const s = stats[c.id];
                  const base = s?.delivered || c.sent;
                  return (
                    <tr key={c.id}>
                      <td><Link href={`/admin/email/${c.id}`}><strong>{c.subject}</strong></Link><br /><span className="fine">{AUDIENCES[c.audience].label} · {fmtDate(c.sent_at)}</span></td>
                      <td>{c.sent.toLocaleString()}</td>
                      <td>{s ? <>{s.delivered.toLocaleString()} <span className="fine">{pct(s.delivered, c.sent)}</span></> : "-"}</td>
                      <td>{s ? <>{s.opened.toLocaleString()} <span className="fine">{pct(s.opened, base)}</span></> : "-"}</td>
                      <td>{s ? <>{s.clicked.toLocaleString()} <span className="fine">{pct(s.clicked, base)}</span></> : "-"}</td>
                      <td>{s ? s.bounced : "-"}</td>
                      <td>{s ? s.spam : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: "1.3rem", marginTop: 28 }}>Guidebook email series (last 90 days)</h2>
          <div className="hero-card" style={{ overflowX: "auto" }}>
            <table className="meet-table">
              <thead><tr><th>Guidebook</th><th>Email</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Clicked</th><th>Bounced</th></tr></thead>
              <tbody>
                {!seq.length && <tr><td colSpan={7}>No guidebook emails sent in the last 90 days.</td></tr>}
                {seq.map((r) => {
                  const base = r.delivered || r.sent;
                  return (
                    <tr key={`${r.sequence}-${r.step}`}>
                      <td>{sequenceName(r.sequence as never)}</td><td>{r.step + 1} of 5</td><td>{r.sent}</td>
                      <td>{r.delivered}</td><td>{r.opened} <span className="fine">{pct(r.opened, base)}</span></td>
                      <td>{r.clicked} <span className="fine">{pct(r.clicked, base)}</span></td><td>{r.bounced}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {last && <details className="em-details" style={{ marginTop: 24 }}><summary>SendGrid webhook address</summary><input readOnly className="copy-link" value={webhookUrl()} aria-label="Webhook address" /></details>}
        </div>
      </section>
    </>
  );
}
