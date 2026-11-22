import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { partnerOptions } from "@/lib/leadQuery";
import { detailRows, leadName, type LeadRow } from "@/lib/leads";
import { leadActivity } from "@/lib/analytics";
import { runsForLeads, SEQUENCES, sequenceName, STEP_DAYS } from "@/lib/sequences";
import { LEAD_STATUSES, SEGMENT_PATH, SEGMENTS, isSegment, segmentLabel, statusLabel } from "@/lib/segments";

export const metadata: Metadata = { title: "Lead", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  received: "Lead received",
  paid: "Payment received",
  notified: "Notification sent",
  notify_failed: "Notification failed",
  status: "Status changed",
  note: "Note",
  passed: "Passed to partner",
  returned: "Passed back to Labb",
  archived: "Archived",
  unarchived: "Restored from archive",
  segment: "Segment changed",
  partner_emailed: "Partner emailed",
  sequence: "Guidebook emails",
};

export default async function AdminLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/leads/${id}`);
  if (!/^\d+$/.test(id)) notFound();
  const db = sql();
  const [lead] = await db<LeadRow[]>`
    select l.*, m.name as partner_name, m.clinic as partner_clinic from leads l left join members m on m.id = l.partner_id where l.id = ${id}`;
  if (!lead) notFound();
  const [events, partners, flash, runs] = await Promise.all([
    db<{ id: string; event: string; detail: string | null; actor_name: string | null; created_at: Date }[]>`
      select id, event, detail, actor_name, created_at from lead_events where lead_id = ${id} order by created_at desc, id desc`,
    partnerOptions(),
    readFlash(),
    runsForLeads([String(lead.id)]),
  ]);
  const views = await leadActivity(String(lead.id), lead.email);
  const visits = [...new Set(views.map((v) => v.session))];
  const orgSeen = views.find((v) => v.org)?.org;

  const d = lead.data || {};
  const facts: [string, unknown][] = [
    ["Name", [lead.first_name, lead.last_name].filter(Boolean).join(" ")],
    ["Organization", lead.company],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["City / State", [lead.city, lead.state].filter(Boolean).join(", ")],
    ["Segment", segmentLabel(lead.segment)],
    ["Lead path", isSegment(lead.segment) ? SEGMENT_PATH[lead.segment] : ""],
    ["Interested in", lead.products],
    ["Industry", lead.industry],
    ["Monthly volume", lead.volume],
    ["Interest level", lead.interest],
    ["Message", lead.message],
    ["Download", lead.resource],
    ["Legal business name", d.legalName],
    ["Agreement signer", d.signer],
    ["Business type", d.clinicType],
    ...detailRows(d.details as Record<string, string> | undefined),
    ["Services offered", d.services],
    ["Affiliation", d.affiliation],
    ["Send CPP agreement", lead.type === "cpp-application" ? (d.wantsAgreement ? "Yes, send the agreement" : "No, wants a call first") : ""],
    ["Newsletter", d.newsletter ? "Yes" : "No"],
    ["Form", lead.type],
    ["Submitted from", lead.page],
    ["Referrer", lead.referrer],
    ["Campaign", lead.utm ? Object.entries(lead.utm).map(([k, v]) => `${k}=${v}`).join(" ") : ""],
    ["Received", fmtDate(lead.created_at) + " ET"],
  ];

  const post = (action: string, children: React.ReactNode) => (
    <form action="/api/admin/leads" method="post">
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="action" value={action} />
      {children}
    </form>
  );

  return (
    <>
      <AdminBar title="Lead detail" current="/admin/leads" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <p style={{ marginTop: 0 }}><Link href="/admin/leads">← All leads</Link></p>
          <Flash flash={flash} />
          <h1 style={{ fontSize: "1.8rem", marginBottom: 6 }}>{leadName(lead)}</h1>
          <p className="fine" style={{ textAlign: "left", margin: "0 0 10px" }}><Link href={`/admin/crm/p/${encodeURIComponent(lead.email.toLowerCase())}`}>Open CRM record</Link> for notes, tasks and everything else on file for this person.</p>
          <p style={{ marginTop: 0 }}>
            <span className={`status s-${lead.status}`}>{statusLabel(lead.status)}</span>{" "}
            <span className="tag plain">{lead.owner === "partner" ? `Passed to ${lead.partner_clinic || lead.partner_name}` : "Labb owned"}</span>{" "}
            {lead.archived && <span className="tag plain">Archived</span>}
          </p>

          <div className="lead-grid">
            <div className="hero-card">
              <table className="lead-facts">
                <tbody>
                  {facts.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => (
                    <tr key={k}><th scope="row">{k}</th><td>{k === "Email" ? <a href={`mailto:${v}`}>{String(v)}</a> : k === "Phone" ? <a href={`tel:${String(v).replace(/[^\d+]/g, "")}`}>{String(v)}</a> : String(v)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lead-actions">
              <div className="hero-card">
                {post("status", <>
                  <h3><label htmlFor="l-status">Status</label></h3>
                  <select id="l-status" name="status" defaultValue={lead.status}>
                    {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <button className="btn btn-outline-dark" type="submit">Update status</button>
                </>)}
              </div>

              <div className="hero-card">
                {lead.owner === "labb" ? post("pass", <>
                  <h3><label htmlFor="l-partner">Pass to a channel partner</label></h3>
                  {partners.length ? (
                    <>
                      <select id="l-partner" name="partner" required defaultValue="">
                        <option value="" disabled>Choose a CPP member</option>
                        {partners.map((p) => <option key={p.id} value={p.id}>{p.clinic ? `${p.clinic} (${p.name})` : p.name}</option>)}
                      </select>
                      <button className="btn btn-primary" type="submit">Pass lead and email partner</button>
                      <p className="fine" style={{ margin: 0 }}>Labb keeps this record and its history. The partner sees the lead in their CPP login.</p>
                    </>
                  ) : <p className="fine" style={{ margin: 0 }}>No active CPP members yet. Add them under CPP members.</p>}
                </>) : post("return", <>
                  <h3>Owner</h3>
                  <p style={{ margin: 0 }}>Passed to <strong>{lead.partner_clinic || lead.partner_name}</strong>{lead.passed_at ? ` on ${fmtDate(lead.passed_at)}` : ""}.</p>
                  <button className="btn btn-outline-dark" type="submit">Pass back to Labb</button>
                </>)}
              </div>

              <div className="hero-card">
                {post("sequence", <>
                  <h3><label htmlFor="l-seq">Guidebook emails</label></h3>
                  <select id="l-seq" name="sequence" required defaultValue="">
                    <option value="" disabled>Choose a guidebook</option>
                    <optgroup label="Employers (CPP members can send these)">
                      {SEQUENCES.filter((q) => q.audience === "employer").map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
                    </optgroup>
                    <optgroup label="Clinics">
                      {SEQUENCES.filter((q) => q.audience === "clinic").map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
                    </optgroup>
                  </select>
                  <button className="btn btn-primary" type="submit">Start sequence</button>
                  <p className="fine" style={{ margin: 0 }}>{STEP_DAYS.length} emails over {STEP_DAYS[STEP_DAYS.length - 1]} days: the guidebook, three articles and a follow-up. <Link href="/admin/sequences">Preview</Link></p>
                </>)}
                {runs.length > 0 && (
                  <ul className="seq-runs">
                    {runs.map((r) => (
                      <li key={r.id}>
                        <span><strong>{sequenceName(r.sequence)}</strong> <span className={`status s-${r.status === "active" ? "contacted" : r.status === "completed" ? "won" : "lost"}`}>{r.status}</span></span>
                        <span className="fine">{r.sent} of {STEP_DAYS.length} sent{r.next_due ? ` · next ${fmtDate(r.next_due)}` : ""} · {r.partner_id ? "by CPP member " : ""}{r.starter_name || "System"}, {fmtDate(r.created_at)}</span>
                        {r.status === "active" && post("sequence-stop", <><input type="hidden" name="run" value={r.id} /><button className="linkish" type="submit">Stop</button></>)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="hero-card">
                {post("note", <>
                  <h3><label htmlFor="l-note">Add a note</label></h3>
                  <textarea id="l-note" name="note" required maxLength={4000} />
                  <button className="btn btn-outline-dark" type="submit">Save note</button>
                </>)}
              </div>

              <div className="hero-card">
                {post("segment", <>
                  <h3><label htmlFor="l-seg">Segment</label></h3>
                  <select id="l-seg" name="segment" defaultValue={lead.segment}>
                    {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.short}</option>)}
                  </select>
                  <button className="btn btn-outline-dark" type="submit">Change segment</button>
                </>)}
                <div style={{ marginTop: 14 }}>
                  {post(lead.archived ? "unarchive" : "archive", <button className="linkish" type="submit">{lead.archived ? "Restore from archive" : "Archive this lead"}</button>)}
                </div>
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: "1.3rem", marginTop: 40 }}>Website activity</h2>
          {!views.length ? (
            <p className="fine" style={{ textAlign: "left" }}>No visits linked yet. Visits are linked when this person submits a form or clicks a link in a Labb email from their browser.</p>
          ) : (
            <>
              <p className="fine" style={{ textAlign: "left" }}>{visits.length} {visits.length === 1 ? "visit" : "visits"} · {views.length} pages · first seen {fmtDate(views[views.length - 1].ts)} ET{orgSeen ? ` · network: ${orgSeen}` : ""}</p>
              <div className="lead-visits">
                {visits.slice(0, 15).map((sid) => {
                  const pv = views.filter((v) => v.session === sid).reverse();
                  const first = pv[0];
                  const src = first.utm_source ? `${first.utm_source}${first.utm_campaign ? ` / ${first.utm_campaign}` : ""}` : first.referrer || "Direct";
                  return (
                    <details key={sid} className="hero-card">
                      <summary><strong>{fmtDate(first.ts)} ET</strong> <span className="fine">· {pv.length} {pv.length === 1 ? "page" : "pages"} · from {src}{first.device ? ` · ${first.device}` : ""}</span></summary>
                      <ol>
                        {pv.map((v, i) => <li key={i}><a href={v.path} target="_blank" rel="noreferrer">{v.title?.replace(/ \| Labb$/, "") || v.path}</a> <span className="fine">{v.path}{v.duration_ms ? ` · ${Math.round(v.duration_ms / 1000)}s` : ""}</span></li>)}
                      </ol>
                    </details>
                  );
                })}
              </div>
            </>
          )}

          <h2 style={{ fontSize: "1.3rem", marginTop: 40 }}>History</h2>
          <ul className="history">
            {events.map((e) => (
              <li key={e.id}>
                <strong>{EVENT_LABEL[e.event] || e.event}</strong>{e.detail ? `: ${e.detail}` : ""}
                <span className="when">{fmtDate(e.created_at)} ET · {e.actor_name || "System"}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
