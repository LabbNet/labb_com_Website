import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { partnerOptions } from "@/lib/leadQuery";
import { detailRows, duplicateLeads, leadName, type LeadRow } from "@/lib/leads";
import { leadActivity } from "@/lib/analytics";
import { runsForLeads, SEQUENCES, sequenceName, STEP_DAYS } from "@/lib/sequences";
import { etDate, fmtWhen, kindInfo, leadMeetings, MEETING_KINDS, MEETING_STATUS, meetingHosts, nextKind, PLATFORMS } from "@/lib/meetings";
import { dupesFor } from "@/lib/dupes";
import { money as qMoney, QUOTE_KINDS, QUOTE_STATUS, quoteNumber, totals as qTotals, type QuoteItem } from "@/lib/salesQuotes";
import { absoluteUrl } from "@/lib/site";
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
  emailed: "Email sent",
  merged: "Duplicates merged",
  accepted: "Lead accepted",
  prospect_emailed: "Prospect emailed",
  meeting: "Meeting",
  repeat: "Submitted again",
  "existing-client": "Existing client",
  prospect: "Prospect again",
};

const TABS = [["overview", "Overview"], ["meetings", "Meetings"], ["quotes", "Quotes"], ["emails", "Emails"], ["visits", "Website visits"], ["history", "History"]] as const;
type Tab = (typeof TABS)[number][0];

export default async function AdminLead({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? "overview") as Tab;
  const me = await requireAdmin(`/admin/leads/${id}`);
  if (!/^\d+$/.test(id)) notFound();
  const db = sql();
  const [lead] = await db<LeadRow[]>`
    select l.*, m.name as partner_name, m.clinic as partner_clinic from leads l left join members m on m.id = l.partner_id where l.id = ${id}`;
  if (!lead) {
    // Merged away: send old links to the record it was merged into.
    const [into] = await db<{ id: string }[]>`select id::text from leads where data->'merged_from' @> ${db.json([{ id: Number(id) }] as never)} limit 1`;
    if (into) redirect(`/admin/leads/${into.id}`);
    notFound();
  }
  const [events, partners, flash, runs] = await Promise.all([
    db<{ id: string; event: string; detail: string | null; actor_name: string | null; created_at: Date }[]>`
      select id, event, detail, actor_name, created_at from lead_events where lead_id = ${id} order by created_at desc, id desc`,
    partnerOptions(),
    readFlash(),
    runsForLeads([String(lead.id)]),
  ]);
  const [hosts, meetings, sales, next, flags, opens] = await Promise.all([
    meetingHosts(),
    db<{ id: string; starts_at: Date; status: string; room_url: string; host_name: string }[]>`
      select g.id, g.starts_at, g.status, g.room_url, m.name as host_name from lead_meetings g join members m on m.id = g.host_id
      where g.lead_id = ${id} order by g.starts_at desc`,
    leadMeetings(id),
    nextKind(id),
    dupesFor(id),
    db<{ m: string; opened: boolean; clicked: boolean }[]>`select lead_meeting::text as m, bool_or(event = 'open') as opened, bool_or(event = 'click') as clicked
      from email_events where lead_meeting in (select g.id from lead_meetings g where g.lead_id = ${id}) group by lead_meeting`.catch(() => []),
  ]);
  const opened = new Map(opens.map((o) => [o.m, o]));
  const [quotes, qItems, qTemplates] = await Promise.all([
    db<{ id: string; title: string; status: string; kind: string; created_at: Date; member_id: string | null; sent_at: Date | null; open_count: number; last_opened_at: Date | null; paid_cents: number | null; signed_name: string | null }[]>`
      select id::text, title, status, kind, created_at, member_id::text, sent_at, open_count, last_opened_at, paid_cents, signed_name from sales_quotes where lead_id = ${id} order by created_at desc`.catch(() => []),
    db<(QuoteItem & { quote_id: string })[]>`select i.* from sales_quote_items i join sales_quotes q on q.id = i.quote_id where q.lead_id = ${id}`.catch(() => []),
    db<{ id: string; name: string; kind: string }[]>`select id::text, name, kind from quote_templates where active order by name`.catch(() => []),
  ]);
  const today = etDate(new Date());
  const times: string[] = [];
  for (let mi = 7 * 60; mi <= 19 * 60; mi += 15) times.push(`${String(Math.floor(mi / 60)).padStart(2, "0")}:${String(mi % 60).padStart(2, "0")}`);
  const clock = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
  const step = (k: string) => {
    const list = sales.filter((g) => g.kind === k);
    const cur = list.find((g) => g.status === "booked") || list.find((g) => g.status === "completed") || list[0];
    return { cur, count: list.length };
  };
  const hostName = lead.meeting_host ? hosts.find((h) => h.id === lead.meeting_host)?.name : null;
  const dups = await duplicateLeads(lead);
  const [views, [blocked]] = await Promise.all([
    leadActivity(String(lead.id), lead.email),
    db<{ n: number }[]>`select 1 as n from email_suppressions where lower(email) = ${lead.email.toLowerCase()} and audience = 'all' limit 1`,
  ]);
  const visits = [...new Set(views.map((v) => v.session))];
  const orgSeen = views.find((v) => v.org)?.org;

  const d = lead.data || {};
  const groups: { title: string; rows: [string, unknown][] }[] = [
    { title: "About them", rows: [
      ["Name", [lead.first_name, lead.last_name].filter(Boolean).join(" ")],
      ["Organization", lead.company],
      ["Email", lead.email],
      ["Phone", lead.phone],
      ["Location", [lead.city, lead.state].filter(Boolean).join(", ")],
      ["Legal business name", d.legalName],
      ["Agreement signer", d.signer],
      ["Business type", d.clinicType],
      ["Services offered", d.services],
      ["Affiliation", d.affiliation],
    ] },
    { title: "What they need", rows: [
      ["Segment", segmentLabel(lead.segment)],
      ["Lead path", isSegment(lead.segment) ? SEGMENT_PATH[lead.segment] : ""],
      ["Interested in", lead.products],
      ["Industry", lead.industry],
      ["Monthly volume", lead.volume],
      ["Interest level", lead.interest],
      ["Download", lead.resource],
      ...detailRows(d.details as Record<string, string> | undefined),
      ["Send CPP agreement", lead.type === "cpp-application" ? (d.wantsAgreement ? "Yes, send the agreement" : "No, wants a call first") : ""],
    ] },
    { title: "Where it came from", rows: [
      ["Form", lead.type === "manual" ? "Added by hand" : lead.type.replace(/-/g, " ")],
      ["Submitted from", lead.page],
      ["Referrer", lead.referrer],
      ["Campaign", lead.utm ? Object.entries(lead.utm).map(([k, v]) => `${k}=${v}`).join(" ") : ""],
      ["Newsletter", d.newsletter ? "Yes" : "No"],
      ["Received", fmtDate(lead.created_at) + " ET"],
    ] },
  ];
  const formCount = 1 + (((d as { merged_from?: unknown[] }).merged_from?.length) || 0);
  const shown = (v: unknown) => v !== undefined && v !== null && v !== "";

  // What to do next, shown in the header.
  const now = new Date();
  const upcoming = sales.filter((g) => g.status === "booked" && new Date(g.ends_at) > now).sort((x, y) => +new Date(x.starts_at) - +new Date(y.starts_at))[0];
  const needsOutcome = sales.find((g) => g.status === "booked" && new Date(g.ends_at) <= now);
  const nextStep: { text: React.ReactNode; tab?: Tab } =
    needsOutcome ? { text: <>Record how the <strong>{kindInfo(needsOutcome.kind).label.toLowerCase()}</strong> on {fmtWhen(needsOutcome.starts_at)} went.</>, tab: "meetings" }
    : upcoming ? { text: <><strong>{kindInfo(upcoming.kind).label}</strong> {fmtWhen(upcoming.starts_at)} with {upcoming.host_name}{upcoming.room_url && <>. <a href={upcoming.room_url} target="_blank" rel="noreferrer">Join Teams</a></>}</>, tab: "meetings" }
    : lead.status === "existing-client" || lead.status === "won" || lead.status === "lost" || lead.status === "not-qualified" ? { text: <>No next step. This lead is marked <strong>{statusLabel(lead.status)}</strong>.</> }
    : lead.owner === "partner" ? { text: lead.accepted_at ? <>With <strong>{lead.partner_clinic || lead.partner_name}</strong>. They accepted it {fmtDate(lead.accepted_at)}.</> : <>Waiting for <strong>{lead.partner_clinic || lead.partner_name}</strong> to accept it.</> }
    : !lead.accepted_at && !sales.length ? { text: <>Keep it at Labb and send a booking link, schedule the initial discussion, or pass it to a CPP member.</> }
    : { text: <>Schedule the <strong>{kindInfo(next).label.toLowerCase()}</strong>.</>, tab: "meetings" };
  const tabHref = (t: Tab) => `/admin/leads/${lead.id}${t === "overview" ? "" : `?tab=${t}`}`;
  const counts: Partial<Record<Tab, number>> = { meetings: sales.length, quotes: quotes.length, visits: visits.length, history: events.length };

  const post = (action: string, children: React.ReactNode) => (
    <form action="/api/admin/leads" method="post">
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="action" value={action} />
      {tab !== "overview" && <input type="hidden" name="back" value={tabHref(tab)} />}
      {children}
    </form>
  );

  return (
    <>
      <AdminBar title="Lead detail" current="/admin/leads" />
      <section className="section lp" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <p style={{ margin: "0 0 12px" }}><Link href="/admin/leads">← All leads</Link></p>
          <Flash flash={flash} />

          <header className="lp-head">
            <div className="lp-id">
              <span className="lp-eyebrow">Lead #{lead.id} · {segmentLabel(lead.segment)} · received {fmtDate(lead.created_at)} ET</span>
              <h1>{leadName(lead)}{formCount > 1 && <span className="form-count lg" title={`${formCount} forms completed by this person`} aria-label={`${formCount} forms completed`}>{formCount}</span>}</h1>
              {(lead.company || lead.city || lead.state) && lead.company !== leadName(lead) && <p className="lp-org">{[lead.company, [lead.city, lead.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p>}
              {(!lead.company || [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim().toLowerCase() === lead.company.trim().toLowerCase()) && <p className="lp-warn">{lead.company ? "The company name matches the contact's name." : "No company name."} Quotes show the company as &ldquo;Prepared for&rdquo;, so add the real organization name below.</p>}
              <details className="lp-edit" open={(!lead.company || [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim().toLowerCase() === lead.company.trim().toLowerCase())}>
                <summary>Edit company and contact</summary>
                {post("contact", <div className="lp-editform">
                  <div className="field lp-wide"><label htmlFor="e-co">Company or organization</label><input id="e-co" name="company" defaultValue={lead.company || ""} maxLength={160} placeholder="Acme Logistics LLC" /></div>
                  <div className="field"><label htmlFor="e-fn">First name</label><input id="e-fn" name="first_name" defaultValue={lead.first_name || ""} maxLength={80} /></div>
                  <div className="field"><label htmlFor="e-ln">Last name</label><input id="e-ln" name="last_name" defaultValue={lead.last_name || ""} maxLength={80} /></div>
                  <div className="field"><label htmlFor="e-ph">Phone</label><input id="e-ph" name="phone" defaultValue={lead.phone || ""} maxLength={40} /></div>
                  <div className="field"><label htmlFor="e-ci">City</label><input id="e-ci" name="city" defaultValue={lead.city || ""} maxLength={80} /></div>
                  <div className="field"><label htmlFor="e-st">State</label><input id="e-st" name="state" defaultValue={lead.state || ""} maxLength={80} /></div>
                  <div className="lp-wide"><button className="btn btn-primary btn-sm" type="submit">Save</button> <span className="fine">Open quotes pick up the new company name.</span></div>
                </div>)}
              </details>
              <p className="lp-contact">
                <a href={`mailto:${lead.email}`}>{lead.email}</a>
                {lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>{lead.phone}</a>}
                <Link href={`/admin/crm/p/${encodeURIComponent(lead.email.toLowerCase())}`}>CRM record</Link>
              </p>
              <p className="lp-chips">
                <span className={`status s-${lead.status}`}>{statusLabel(lead.status)}</span>
                <span className="tag plain">{lead.owner === "partner" ? `CPP: ${lead.partner_clinic || lead.partner_name}` : lead.accepted_at ? `Labb${hostName ? `: ${hostName}` : ""}` : "Labb, not yet accepted"}</span>
                {lead.existing_client && lead.status !== "existing-client" && <span className="tag plain client-tag">Existing client</span>}
                {lead.archived && <span className="tag plain">Archived</span>}
                {blocked && <span className="tag plain lp-dns">Do not send</span>}
              </p>
            </div>
            <div className="lp-side">
              <div className="lp-next">
                <span>Next step</span>
                <p>{nextStep.text}</p>
                {nextStep.tab && tab !== nextStep.tab && <Link href={tabHref(nextStep.tab)} className="fine">Go to {TABS.find(([k]) => k === nextStep.tab)![1]} →</Link>}
              </div>
              {post("status", <div className="lp-status">
                <label htmlFor="l-status">Status</label>
                <select id="l-status" name="status" defaultValue={lead.status}>
                  {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button className="btn btn-outline-dark btn-sm" type="submit">Save</button>
              </div>)}
            </div>
          </header>

          {flags.length > 0 && (
            <div className="dup-flag">
              <strong>Possible duplicate.</strong>{" "}
              {flags.map((f, i) => <span key={f.id}>{i ? "; " : ""}<Link href={`/admin/leads/${f.other}`}>#{f.other} {f.name || f.email}{f.company ? `, ${f.company}` : ""}</Link> <span className="fine">({f.reasons.join(", ")})</span></span>)}
              {" · "}<Link href="/admin/leads/duplicates">Review and merge</Link>
            </div>
          )}
              {dups.length > 0 && (
                <details className="dup-flag dup-card">
                  <summary><strong>{dups.length === 1 ? "1 other submission" : `${dups.length} other submissions`} from this person</strong> (same email or phone). Review and merge</summary>
                  {post("merge", <>
                    
                    <p className="fine" style={{ margin: "8px 0 0", textAlign: "left" }}>Merging keeps this lead and moves their history, meetings, quotes and website visits here. Blank fields here are filled from the others, messages are kept, and the others are removed.</p>
                    <ul className="dup-list">
                      {dups.map((d) => (
                        <li key={d.id}>
                          <label>
                            <input type="checkbox" name="dup" value={d.id} defaultChecked={!(d.owner === "partner" && d.partner_id !== lead.partner_id)} disabled={d.owner === "partner" && d.partner_id !== lead.partner_id} />
                            <span>
                              <strong>#{d.id} · {d.type.replace(/-/g, " ")}</strong> · {fmtDate(d.created_at)} ET · {statusLabel(d.status as never)}{d.archived ? " · archived" : ""}
                              {d.email.toLowerCase() !== lead.email.toLowerCase() && <><br /><span className="fine">{d.email} (matched by phone)</span></>}
                              {d.owner === "partner" && d.partner_id !== lead.partner_id && <><br /><span className="fine" style={{ color: "#b42318" }}>With a CPP member. Pass it back to Labb to merge it.</span></>}
                              {d.message && <><br /><span className="fine">&ldquo;{d.message.slice(0, 140)}{d.message.length > 140 ? "..." : ""}&rdquo;</span></>}
                            </span>
                          </label>
                          <Link href={`/admin/leads/${d.id}`} className="fine">Open</Link>
                        </li>
                      ))}
                    </ul>
                    {dups.some((d) => !(d.owner === "partner" && d.partner_id !== lead.partner_id)) && <button className="btn btn-primary" type="submit">Merge into this lead</button>}
                  </>)}
                </details>
              )}

          <div className="sales-mtgs lp-pipe">
            <ol className="sm-steps">
              {MEETING_KINDS.map((k) => {
                const { cur, count } = step(k.value);
                const st = cur ? (cur.status === "booked" && new Date(cur.ends_at) < new Date() ? "past" : cur.status) : "none";
                return (
                  <li key={k.value} className={`sm-step sm-${st}`}><Link href={tabHref("meetings")} className="sm-link">
                    <span className="sm-num">{k.step}</span>
                    <div>
                      <strong>{k.label}</strong>
                      {!cur ? <span className="fine">Not scheduled</span> : (
                        <>
                          <span className="sm-when">{st === "past" ? "Needs an outcome" : MEETING_STATUS[cur.status]} · {fmtWhen(cur.starts_at)}</span>
                          <span className="fine">With {cur.host_name}{opened.get(cur.id)?.opened ? " · invite opened" : ""}{count > 1 ? ` · ${count} meetings` : ""}</span>
                        </>
                      )}
                    </div>
                  </Link></li>
                );
              })}
            </ol>
          </div>

          <nav className="lp-tabs" aria-label="Lead sections">
            {TABS.map(([k, label]) => (
              <Link key={k} href={tabHref(k)} aria-current={tab === k ? "page" : undefined}>{label}{counts[k] ? <span>{counts[k]}</span> : null}</Link>
            ))}
          </nav>

          <div className="lp-body">
            <div className="lp-main">
              {tab === "overview" && (
                <>
                  {lead.message && (
                    <div className="hero-card lp-message">
                      <h2>Their message</h2>
                      <p>{lead.message}</p>
                    </div>
                  )}
                  <div className="lp-facts">
                    {groups.map((g) => {
                      const rows = g.rows.filter(([, v]) => shown(v));
                      if (!rows.length) return null;
                      return (
                        <div key={g.title} className="hero-card">
                          <h2>{g.title}</h2>
                          <dl>
                            {rows.map(([k, v]) => (
                              <div key={k}><dt>{k}</dt><dd>{k === "Email" ? <a href={`mailto:${v}`}>{String(v)}</a> : k === "Phone" ? <a href={`tel:${String(v).replace(/[^\d+]/g, "")}`}>{String(v)}</a> : String(v)}</dd></div>
                            ))}
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                  <div className="hero-card">
                    <div className="lp-cardhead"><h2>Recent activity</h2>{events.length > 6 && <Link href={tabHref("history")} className="fine">All {events.length} →</Link>}</div>
                    {post("note", <div className="lp-note">
                      <label className="sr-only" htmlFor="l-note">Add a note</label>
                      <textarea id="l-note" name="note" required maxLength={4000} rows={2} placeholder="Add a note: a call, what they said, the next step" />
                      <button className="btn btn-outline-dark btn-sm" type="submit">Save note</button>
                    </div>)}
                    <ul className="history lp-history">
                      {events.slice(0, 6).map((e) => (
                        <li key={e.id}><strong>{EVENT_LABEL[e.event] || e.event}</strong>{e.detail ? `: ${e.event === "emailed" ? e.detail.split("\n")[0] : e.detail}` : ""}<span className="when">{fmtDate(e.created_at)} ET · {e.actor_name || "System"}</span></li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {tab === "meetings" && (
                <div className="hero-card sales-mtgs">
                  <div className="sm-head">
                    <h2>Sales meetings</h2>
                    <span className="fine">Invites go to {lead.email} with a calendar file, then a reminder 1 hour before and the link 10 minutes before. Times are Eastern.</span>
                  </div>
            {sales.length > 0 && (
              <ul className="sm-list">
                {sales.map((g) => {
                  const k = kindInfo(g.kind);
                  const live = g.status === "booked";
                  return (
                    <li key={g.id}>
                      <div className="sm-row">
                        <span><strong>{k.label}</strong> · {fmtWhen(g.starts_at)} · {g.host_name} <span className={`sm-badge sm-${g.status}`}>{MEETING_STATUS[g.status]}</span>
                          {opened.get(g.id) && <span className="fine"> · invite {opened.get(g.id)!.clicked ? "opened and link clicked" : opened.get(g.id)!.opened ? "opened" : "delivered"}</span>}</span>
                        {live && g.room_url && <a href={g.room_url} target="_blank" rel="noreferrer" className="fine">Join {/teams\.(microsoft|live)\.com/.test(g.room_url) ? "Teams" : "meeting"}</a>}{g.notify_lead === false && <span className="fine"> · lead not emailed</span>}
                      </div>
                      {g.notes && <p className="fine sm-note">Agenda: {g.notes}</p>}
                      {g.outcome && <p className="fine sm-note">Outcome: {g.outcome}</p>}
                      {(live || g.status === "completed" || g.status === "no-show") && (
                        <details className="sm-actions">
                          <summary>{live ? "Record outcome, move or cancel" : "Edit outcome"}</summary>
                          {post("meeting-done", <>
                            <input type="hidden" name="meeting" value={g.id} />
                            <label className="sr-only" htmlFor={`o-${g.id}`}>Outcome</label>
                            <textarea id={`o-${g.id}`} name="outcome" rows={2} maxLength={1000} placeholder="What happened and the next step" defaultValue={g.outcome || ""} />
                            <div className="sm-btns">
                              <button className="btn btn-primary btn-sm" type="submit">Mark completed</button>
                              <button className="btn btn-outline-dark btn-sm" type="submit" name="action" value="meeting-noshow">No-show</button>
                            </div>
                          </>)}
                          {live && post("meeting-schedule", <>
                            <input type="hidden" name="replace" value={g.id} />
                            <input type="hidden" name="kind" value={g.kind} />
                            <input type="hidden" name="host" value={g.host_id} />
                            <input type="hidden" name="room" value={g.room_url} />
                            <input type="hidden" name="platform" value={g.platform || "teams"} />
                            <input type="hidden" name="notify" value={g.notify_lead === false ? "0" : "1"} />
                            <input type="hidden" name="agenda" value={g.notes || ""} />
                            <input type="hidden" name="minutes" value={Math.round((new Date(g.ends_at).getTime() - new Date(g.starts_at).getTime()) / 60000)} />
                            <div className="sm-btns">
                              <input type="date" name="date" required min={today} defaultValue={etDate(new Date(g.starts_at))} aria-label="New date" />
                              <select name="time" aria-label="New time" defaultValue={new Date(g.starts_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" })}>
                                {times.map((t) => <option key={t} value={t}>{clock(t)}</option>)}
                              </select>
                              <button className="btn btn-outline-dark btn-sm" type="submit">Move and send updated invite</button>
                            </div>
                          </>)}
                          {live && post("meeting-noshow-resched", <><input type="hidden" name="meeting" value={g.id} /><button className="btn btn-outline-dark btn-sm" type="submit">Lead never showed: send a reschedule link</button></>)}
                          {live && post("meeting-cancel", <><input type="hidden" name="meeting" value={g.id} /><button className="linkish" type="submit">Cancel the meeting and email {lead.first_name || "them"}</button></>)}
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {lead.owner === "labb" && (
              <div className="sm-pick">
                <div>
                  <strong>Let {lead.first_name || "the lead"} pick a time</strong>
                  <span className="fine">Emails a link to the host&apos;s calendar. They choose an open time, and the meeting, invite and reminders follow automatically.{lead.book_token ? " A link was sent before; this sends it again." : ""}</span>
                </div>
                {post("accept-labb", <div className="sm-pickform">
                  <select name="host" aria-label="Whose calendar" defaultValue={lead.meeting_host || me.id}>
                    {hosts.map((h) => <option key={h.id} value={h.id}>{h.id === me.id ? `My calendar (${h.name})` : `${h.name}'s calendar`}{h.hours ? "" : " (no hours set)"}</option>)}
                    <option value="any">Anyone available</option>
                  </select>
                  <button className="btn btn-outline-dark btn-sm" type="submit">Send my calendar</button>
                </div>)}
              </div>
            )}
            <details className="sm-new" open={!sales.some((g) => g.status === "booked" && new Date(g.ends_at) > new Date())}>
              <summary>Schedule a meeting yourself</summary>
              {post("meeting-schedule", <div className="sm-form">
                <div className="field"><label htmlFor="sm-kind">Meeting</label>
                  <select id="sm-kind" name="kind" defaultValue={next}>
                    {MEETING_KINDS.map((k) => <option key={k.value} value={k.value}>{k.step}. {k.label}</option>)}
                  </select></div>
                <div className="field"><label htmlFor="sm-date">Date</label><input id="sm-date" type="date" name="date" required min={today} /></div>
                <div className="field"><label htmlFor="sm-time">Time (ET)</label>
                  <select id="sm-time" name="time" defaultValue="10:00">{times.map((t) => <option key={t} value={t}>{clock(t)}</option>)}</select></div>
                <div className="field"><label htmlFor="sm-min">Length</label>
                  <select id="sm-min" name="minutes" defaultValue={String(kindInfo(next).minutes)}>{[15, 30, 45, 60, 90].map((n) => <option key={n} value={n}>{n} minutes</option>)}</select></div>
                <div className="field"><label htmlFor="sm-host">With</label>
                  <select id="sm-host" name="host" defaultValue={lead.meeting_host || me.id}>{hosts.map((h) => <option key={h.id} value={h.id}>{h.id === me.id ? `Me (${h.name})` : h.name}</option>)}</select></div>
                <div className="field"><label htmlFor="sm-plat">Where</label>
                  <select id="sm-plat" name="platform" defaultValue="labb">{PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                <div className="field"><label htmlFor="sm-room">Your meeting link</label><input id="sm-room" name="room" type="url" placeholder="https://" defaultValue={hosts.find((h) => h.id === me.id)?.meeting_url || ""} />
                  <span className="fine">Used with &ldquo;My own meeting link&rdquo;. Blank uses the host&apos;s saved link.</span></div>
                <div className="field sm-wide"><label className="sm-check"><input type="checkbox" name="notify" value="1" defaultChecked /> Email the lead the invite now, a reminder 1 hour before and the link 10 minutes before</label>
                  <span className="fine">Uncheck to add a meeting you arranged another way. Nothing is sent to the lead.</span></div>
                <div className="field sm-wide"><label htmlFor="sm-agenda">Agenda (included in the invite)</label><textarea id="sm-agenda" name="agenda" rows={2} maxLength={2000} /></div>
                <div className="sm-wide"><button className="btn btn-primary" type="submit">Schedule meeting</button></div>
              </div>)}
            </details>
                </div>
              )}

              {tab === "quotes" && (
                <>
                  <div className="hero-card">
                    <h2>Quotes</h2>
                    {!quotes.length ? <p className="fine" style={{ textAlign: "left", margin: 0 }}>No quotes yet. Start one below.</p> : (
                      <table className="meet-table">
                        <thead><tr><th>Quote</th><th>Status</th><th>Due at acceptance</th><th>Opened</th></tr></thead>
                        <tbody>{quotes.map((qq) => (
                          <tr key={qq.id}>
                            <td><Link href={`/admin/sales-quotes/${qq.id}`}><strong>{quoteNumber(qq)}</strong></Link><br /><span className="fine">{qq.title}</span></td>
                            <td><span className={`qs qs-${qq.status}`}>{QUOTE_STATUS[qq.status]}</span>{qq.signed_name && <><br /><span className="fine">Signed by {qq.signed_name}</span></>}</td>
                            <td>{qq.paid_cents != null ? <>{qMoney(qq.paid_cents)} <span className="fine">paid</span></> : qMoney(qTotals(qItems.filter((i) => String(i.quote_id) === qq.id)).dueToday)}</td>
                            <td>{qq.open_count ? <>{qq.open_count}× <span className="fine">· {fmtDate(qq.last_opened_at)}</span></> : <span className="fine">{qq.sent_at ? "Not yet" : "Not sent"}</span>}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    )}
                  </div>
                  <div className="hero-card">
                    <h2>Start a quote</h2>
                    <form action="/api/admin/sales-quotes" method="post" className="nq-form">
                      <input type="hidden" name="action" value="create" />
                      <input type="hidden" name="lead" value={lead.id} />
                      <div className="nq-kinds">
                        {QUOTE_KINDS.map((k, i) => (
                          <label key={k.value} className="nq-kind">
                            <input type="radio" name="kind" value={k.value} defaultChecked={i === (lead.segment === "employer" ? 1 : 0)} required />
                            <span><strong>{k.label}</strong><span className="fine">{k.blurb}</span></span>
                          </label>
                        ))}
                      </div>
                      <div className="lp-row">
                        <label className="sr-only" htmlFor="nq-t">Template</label>
                        <select id="nq-t" name="template" defaultValue="">
                          <option value="">Default template</option>
                          {qTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button className="btn btn-primary" type="submit">Start quote</button>
                      </div>
                    </form>
                    <p className="fine" style={{ textAlign: "left", margin: "6px 0 0" }}><Link href="/admin/sales-quotes/templates">Quote templates</Link></p>
                  </div>
                </>
              )}

              {tab === "emails" && (
                <>
                  <div className="hero-card lp-form">
                {post("email", <>
                  <h3><label htmlFor="l-subj">Send an email</label></h3>
                  <p className="fine" style={{ margin: 0, textAlign: "left" }}>To {lead.email}. Sent from {me.name} at Labb, and replies come to {me.email}.</p>
                  {blocked && <p className="fine" style={{ margin: 0, textAlign: "left", color: "#9a3412" }}>This address is on Do not send. Only send something they asked for.</p>}
                  <input id="l-subj" name="subject" required maxLength={200} placeholder="Subject" />
                  <textarea name="body" required maxLength={8000} rows={8} defaultValue={`Hi ${lead.first_name || "there"},\n\n\n\n${me.name}\nLabb\n`} aria-label="Message" />
                  <button className="btn btn-primary" type="submit">Send email</button>
                  <p className="fine" style={{ margin: 0, textAlign: "left" }}>The full message is saved to this lead&apos;s history.</p>
                </>)}

                  </div>
                  <div className="hero-card lp-form">
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
                </>
              )}

              {tab === "visits" && (
                <div className="hero-card">
                  <h2>Website visits</h2>
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

                </div>
              )}

              {tab === "history" && (
                <div className="hero-card">
                  <h2>History</h2>
                  {post("note", <div className="lp-note">
                    <label className="sr-only" htmlFor="l-note2">Add a note</label>
                    <textarea id="l-note2" name="note" required maxLength={4000} rows={2} placeholder="Add a note" />
                    <button className="btn btn-outline-dark btn-sm" type="submit">Save note</button>
                  </div>)}
          <ul className="history">
            {events.map((e) => (
              <li key={e.id}>
                {e.event === "emailed" && e.detail ? (
                  <details><summary><strong>Email sent</strong>: {e.detail.split("\n")[0]}</summary><div style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>{e.detail.split("\n").slice(2).join("\n")}</div></details>
                ) : <><strong>{EVENT_LABEL[e.event] || e.event}</strong>{e.detail ? `: ${e.detail}` : ""}</>}
                <span className="when">{fmtDate(e.created_at)} ET · {e.actor_name || "System"}</span>
              </li>
            ))}
          </ul>
                </div>
              )}
            </div>

            <aside className="lp-aside">
              {lead.owner === "labb" ? (
                <div className="hero-card">
                  <h3><label htmlFor="l-host">{lead.accepted_at ? "Labb call" : "Keep at Labb and book a call"}</label></h3>
                  {lead.accepted_at ? (
                    <p className="fine" style={{ margin: 0, textAlign: "left" }}>Accepted {fmtDate(lead.accepted_at)} ET. Assigned to <strong>{hostName || "any available team member"}</strong>.</p>
                  ) : (
                    <p className="fine" style={{ margin: 0, textAlign: "left" }}>Emails {lead.email} that someone from Labb would like to schedule a call to go over all of the programs, with a link to book a video meeting.</p>
                  )}
                  {meetings.filter((g) => g.status === "booked" && new Date(g.starts_at) > new Date(Date.now() - 3600_000)).map((g) => (
                    <div key={g.id} className="accept-lead" style={{ marginTop: 4 }}>
                      <span className="fine"><strong>Booked:</strong> {fmtWhen(g.starts_at)} with {g.host_name}. {g.room_url && <a href={g.room_url} target="_blank" rel="noreferrer">Join Teams meeting</a>}</span>
                      {post("meeting-cancel", <><input type="hidden" name="meeting" value={g.id} /><button className="linkish" type="submit">Cancel</button></>)}
                    </div>
                  ))}
                  {post("accept-labb", <>
                    <select id="l-host" name="host" defaultValue={lead.meeting_host || (lead.accepted_at ? "any" : me.id)}>
                      <option value="any">Any available Labb team member</option>
                      {hosts.map((h) => <option key={h.id} value={h.id}>{h.id === me.id ? `Me (${h.name})` : h.name}{h.hours ? "" : " · no meeting hours set"}</option>)}
                    </select>
                    <button className={lead.accepted_at ? "btn btn-outline-dark" : "btn btn-primary"} type="submit">{lead.accepted_at ? "Reassign and resend link" : "Accept lead and email booking link"}</button>
                    <button className="linkish" type="submit" name="test" value="1" formNoValidate style={{ justifySelf: "start" }}>Send me a test of this email first</button>
                  </>)}
                  {lead.accepted_at && <div style={{ marginTop: 10 }}>{post("resend-invite", <button className="linkish" type="submit">Resend booking link</button>)}</div>}
                  {lead.book_token && (
                    <div className="field" style={{ marginTop: 10 }}>
                      <label htmlFor="l-bl" className="fine" style={{ textAlign: "left" }}>Their booking link, to paste into your own email</label>
                      <input id="l-bl" readOnly className="copy-link" value={absoluteUrl(`/meet/${lead.book_token}`)} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="hero-card">
                  <h3>CPP member acceptance</h3>
                  <p className="fine" style={{ margin: 0, textAlign: "left" }}>{lead.accepted_at ? `Accepted ${fmtDate(lead.accepted_at)} ET. Labb emailed ${lead.email} to watch for the partner's email.` : "Waiting for the CPP member to accept. When they do, Labb emails the prospect to watch for their email."}</p>
                </div>
              )}

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
                <h3>Lead settings</h3>
                {post("client", <div className="lp-row">
                  <input type="hidden" name="on" value={lead.existing_client ? "0" : "1"} />
                  <span className="fine">{lead.existing_client ? "Existing client. Hidden from the lead list." : "Already a Labb client?"}</span>
                  <button className="btn btn-outline-dark btn-sm" type="submit">{lead.existing_client ? "Remove tag" : "Tag as existing client"}</button>
                </div>)}
                {post("segment", <div className="lp-row">
                  <label className="sr-only" htmlFor="l-seg">Segment</label>
                  <select id="l-seg" name="segment" defaultValue={lead.segment}>
                    {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.short}</option>)}
                  </select>
                  <button className="btn btn-outline-dark btn-sm" type="submit">Change segment</button>
                </div>)}
                <details className="lp-more">
                  <summary>Merge another lead into this one</summary>
                {post("merge-other", <>
                                    <p className="fine" style={{ margin: 0, textAlign: "left" }}>Same person under a different email or spelling. Enter the other lead&apos;s number or email. Its history, meetings and visits move here and it&apos;s removed.</p>
                  <input id="l-other" name="other" required maxLength={254} placeholder="Lead # or email" />
                  <button className="btn btn-outline-dark" type="submit">Merge into this lead</button>
                </>)}

                </details>
                <div style={{ marginTop: 12 }}>
                  {post(lead.archived ? "unarchive" : "archive", <button className="linkish" type="submit">{lead.archived ? "Restore from archive" : "Archive this lead"}</button>)}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
