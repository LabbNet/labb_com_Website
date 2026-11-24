import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { leadName, type LeadRow } from "@/lib/leads";
import { DAYS, fmtWhen, hostSlug, hoursFor, kindInfo, MEETING_KINDS, meetingHosts, minToClock, pipeline } from "@/lib/meetings";
import { absoluteUrl } from "@/lib/site";
import { segmentLabel } from "@/lib/segments";

export const metadata: Metadata = { title: "Lead meetings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TIMES = Array.from({ length: 33 }, (_, i) => 6 * 60 + i * 30); // 6:00 AM to 10:00 PM

// Labb lead meeting schedule: assign incoming Labb leads to a team member (or keep them), see every booked
// call, and set weekly meeting hours and a video room link.
export default async function Meetings({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const me = await requireAdmin("/admin/meetings");
  const { who } = await searchParams;
  const db = sql();
  const [hosts, flash] = await Promise.all([meetingHosts(), readFlash()]);
  const [{ superadmin }] = await db<{ superadmin: boolean }[]>`select superadmin from members where id = ${me.id}`;
  const editId = superadmin && who && hosts.some((h) => h.id === who) ? who : me.id;
  const editing = hosts.find((h) => h.id === editId)!;
  const [[cal]] = await Promise.all([db<{ busy_ics_url: string | null; busy_synced_at: Date | null; busy_error: string | null; n: number }[]>`
    select busy_ics_url, busy_synced_at, busy_error, (select count(*)::int from host_busy b where b.host_id = m.id and b.ends_at > now()) as n from members m where id = ${editId}`]);
  const [hours, toAssign, upcoming, waiting, pipe, outcome] = await Promise.all([
    hoursFor(editId),
    db<LeadRow[]>`select * from leads where owner = 'labb' and not archived and not existing_client and accepted_at is null and status not in ('won', 'lost', 'not-qualified', 'existing-client') and type not in ('newsletter', 'quick-test')
      and created_at > now() - interval '120 days' order by created_at desc limit 100`,
    db<{ id: string; kind: string; starts_at: Date; room_url: string; host_name: string; lead_id: string; first_name: string | null; last_name: string | null; company: string | null; email: string }[]>`
      select g.id, g.kind, g.starts_at, g.room_url, m.name as host_name, l.id as lead_id, l.first_name, l.last_name, l.company, l.email
      from lead_meetings g join members m on m.id = g.host_id join leads l on l.id = g.lead_id
      where g.status = 'booked' and g.ends_at > now() - interval '30 minutes' order by g.starts_at limit 200`,
    db<(LeadRow & { host_name: string | null })[]>`
      select l.*, h.name as host_name from leads l left join members h on h.id = l.meeting_host
      where l.owner = 'labb' and not l.archived and l.accepted_at is not null and l.book_token is not null
        and not exists (select 1 from lead_meetings g where g.lead_id = l.id and g.status = 'booked' and g.ends_at > now())
        and l.status not in ('won', 'lost', 'not-qualified', 'existing-client') order by l.accepted_at desc limit 100`,
    pipeline(),
    db<{ id: string; kind: string; starts_at: Date; host_name: string; lead_id: string; first_name: string | null; last_name: string | null; company: string | null; email: string }[]>`
      select g.id, g.kind, g.starts_at, m.name as host_name, l.id as lead_id, l.first_name, l.last_name, l.company, l.email
      from lead_meetings g join members m on m.id = g.host_id join leads l on l.id = g.lead_id
      where g.status = 'booked' and g.ends_at < now() - interval '30 minutes' order by g.starts_at desc limit 100`,
  ]);
  const pc = (k: string) => pipe.find((p) => p.kind === k) ?? { upcoming: 0, completed: 0, noshow: 0, completed30: 0 };
  const dayRange = (d: number) => hours.find((h) => h.dow === d);
  const summary = (id: string) => hosts.find((h) => h.id === id)!.hours;

  const assign = (l: LeadRow) => (
    <form action="/api/admin/leads" method="post" className="meet-assign">
      <input type="hidden" name="id" value={l.id} />
      <input type="hidden" name="action" value="accept-labb" />
      <input type="hidden" name="back" value="/admin/meetings" />
      <label className="sr-only" htmlFor={`h-${l.id}`}>Assign to</label>
      <select id={`h-${l.id}`} name="host" defaultValue={me.id}>
        <option value="any">Any available</option>
        {hosts.map((h) => <option key={h.id} value={h.id}>{h.id === me.id ? "Me" : h.name}</option>)}
      </select>
      <button className="btn btn-primary" type="submit" style={{ minHeight: 38, padding: "6px 14px" }}>Keep and send booking link</button>
      <button className="linkish" type="submit" name="test" value="1">Test it on me</button>
    </form>
  );

  return (
    <>
      <AdminBar title="Lead meetings" current="/admin/meetings" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <h1 style={{ fontSize: "1.8rem", marginBottom: 6 }}>Lead meetings</h1>
          <p style={{ marginTop: 0 }}>Keep a lead at Labb and Labb emails the prospect a link to book a {30} minute video call with the team member you choose, or with whoever is available. To send a lead to a CPP member instead, open it and pass it; Labb emails the prospect when the member accepts.</p>

          <div className="hero-card" style={{ marginTop: 20, textAlign: "left" }}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 4px" }}>Scheduling links for your emails</h2>
            <p className="fine" style={{ textAlign: "left", margin: "0 0 12px" }}>Paste these into any email or signature. Anyone can book from them; they enter their name, email and organization, and the call lands here as a lead.</p>
            <div className="fields">
              <div className="field"><label htmlFor="sl-me">Calls with you</label><input id="sl-me" readOnly className="copy-link" value={absoluteUrl(`/schedule/${hostSlug(me.name)}`)} /></div>
              <div className="field"><label htmlFor="sl-any">Calls with anyone available</label><input id="sl-any" readOnly className="copy-link" value={absoluteUrl("/schedule")} /></div>
            </div>
            {!hosts.find((h) => h.id === me.id)?.hours && <p className="form-error" style={{ margin: "12px 0 0" }}>Set your meeting hours below, or your link shows no times.</p>}
          </div>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32 }}>Sales pipeline</h2>
          <p className="fine" style={{ textAlign: "left", marginTop: -6 }}>Schedule each meeting from the lead&apos;s page. The invite and calendar file go to the prospect and the host.</p>
          <div className="pipe-grid">
            {MEETING_KINDS.map((k) => {
              const c = pc(k.value);
              return (
                <div key={k.value} className="pipe-card">
                  <span>{k.step}. {k.label}</span>
                  <strong>{c.upcoming}</strong><em>scheduled</em>
                  <p className="fine">{c.completed} completed ({c.completed30} in the last 30 days){c.noshow ? ` · ${c.noshow} no-shows` : ""}</p>
                </div>
              );
            })}
          </div>

          {outcome.length > 0 && (
            <>
              <h2 style={{ fontSize: "1.3rem", marginTop: 32 }}>Meetings that need an outcome ({outcome.length})</h2>
              <div className="hero-card" style={{ overflowX: "auto" }}>
                <table className="meet-table">
                  <thead><tr><th>When</th><th>Meeting</th><th>Prospect</th><th>With</th></tr></thead>
                  <tbody>{outcome.map((g) => (
                    <tr key={g.id}><td>{fmtWhen(g.starts_at)}</td><td>{kindInfo(g.kind).label}</td>
                      <td><Link href={`/admin/leads/${g.lead_id}`}>{[g.first_name, g.last_name].filter(Boolean).join(" ") || g.email}</Link>{g.company ? <span className="fine">, {g.company}</span> : null}</td><td>{g.host_name}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}

          <h2 style={{ fontSize: "1.3rem", marginTop: 32 }}>Upcoming meetings ({upcoming.length})</h2>
          {!upcoming.length ? <p className="fine" style={{ textAlign: "left" }}>No calls booked yet.</p> : (
            <div className="hero-card" style={{ overflowX: "auto" }}>
              <table className="meet-table">
                <thead><tr><th>When</th><th>Meeting</th><th>Prospect</th><th>With</th><th>Video</th></tr></thead>
                <tbody>
                  {upcoming.map((g) => (
                    <tr key={g.id}>
                      <td><strong>{fmtWhen(g.starts_at)}</strong></td>
                      <td>{kindInfo(g.kind).label}</td>
                      <td><Link href={`/admin/leads/${g.lead_id}`}>{[g.first_name, g.last_name].filter(Boolean).join(" ") || g.email}</Link>{g.company ? <span className="fine">, {g.company}</span> : null}</td>
                      <td>{g.host_name}</td>
                      <td><a href={g.room_url} target="_blank" rel="noreferrer">Join</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 style={{ fontSize: "1.3rem", marginTop: 32 }}>Leads to assign ({toAssign.length})</h2>
          <p className="fine" style={{ textAlign: "left", marginTop: -6 }}>Labb leads from the last 120 days that haven&apos;t been accepted or passed to a CPP member. Newsletter sign-ups and Quick Test orders aren&apos;t listed.</p>
          {!toAssign.length ? <p className="fine" style={{ textAlign: "left" }}>Every Labb lead has been accepted or passed to a CPP member.</p> : (
            <div className="hero-card" style={{ overflowX: "auto" }}>
              <table className="meet-table">
                <thead><tr><th>Lead</th><th>Received</th><th>Keep at Labb</th></tr></thead>
                <tbody>
                  {toAssign.map((l) => (
                    <tr key={l.id}>
                      <td><Link href={`/admin/leads/${l.id}`}>{leadName(l)}</Link><br /><span className="fine">{segmentLabel(l.segment)}{l.city || l.state ? ` · ${[l.city, l.state].filter(Boolean).join(", ")}` : ""}</span></td>
                      <td className="fine">{fmtDate(l.created_at)}</td>
                      <td>{assign(l)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 style={{ fontSize: "1.3rem", marginTop: 32 }}>Booking link sent, no call yet ({waiting.length})</h2>
          {!waiting.length ? <p className="fine" style={{ textAlign: "left" }}>Nothing waiting.</p> : (
            <div className="hero-card" style={{ overflowX: "auto" }}>
              <table className="meet-table">
                <thead><tr><th>Lead</th><th>Assigned to</th><th>Accepted</th><th></th></tr></thead>
                <tbody>
                  {waiting.map((l) => (
                    <tr key={l.id}>
                      <td><Link href={`/admin/leads/${l.id}`}>{leadName(l)}</Link></td>
                      <td>{l.host_name || "Any available"}</td>
                      <td className="fine">{fmtDate(l.accepted_at ?? null)}</td>
                      <td>
                        <form action="/api/admin/leads" method="post">
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="action" value="resend-invite" />
                          <input type="hidden" name="back" value="/admin/meetings" />
                          <button className="linkish" type="submit">Resend link</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 style={{ fontSize: "1.3rem", marginTop: 40 }} id="hours">Meeting hours{editId !== me.id ? `: ${editing.name}` : ""}</h2>
          {superadmin && (
            <p className="fine" style={{ textAlign: "left" }}>Team: {hosts.map((h, i) => (
              <span key={h.id}>{i ? " · " : ""}<Link href={`/admin/meetings?who=${h.id}#hours`} aria-current={h.id === editId ? "page" : undefined}>{h.id === me.id ? "Me" : h.name}</Link> ({summary(h.id) ? "hours set" : "no hours"})</span>
            ))}</p>
          )}
          <form action="/api/admin/meetings" method="post" className="hero-card" style={{ maxWidth: 720 }}>
            <input type="hidden" name="who" value={editId} />
            <p className="fine" style={{ textAlign: "left", marginTop: 0 }}>Eastern time. Prospects can book any open {30} minute time inside these hours, up to 3 weeks out. Today and the next two business days are always closed to prospects (book on Tuesday and the earliest day offered is Friday); you can still schedule those days yourself from a lead. 15 minutes stay free before and after every meeting and Outlook appointment.</p>
            <div className="hours-grid">
              {DAYS.map((d, i) => {
                const r = dayRange(i);
                return (
                  <div className="hours-row" key={d}>
                    <strong>{d}</strong>
                    <select name={`s${i}`} defaultValue={r ? String(r.start_min) : ""} aria-label={`${d} start`}>
                      <option value="">Not available</option>
                      {TIMES.map((t) => <option key={t} value={t}>{minToClock(t)}</option>)}
                    </select>
                    <select name={`e${i}`} defaultValue={r ? String(r.end_min) : ""} aria-label={`${d} end`}>
                      <option value="">to</option>
                      {TIMES.map((t) => <option key={t} value={t}>{minToClock(t)}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
            <div className="field" style={{ marginTop: 18 }}>
              <label htmlFor="mu">Personal video meeting link (optional)</label>
              <input id="mu" name="meeting_url" type="url" maxLength={300} defaultValue={editing.meeting_url || ""} placeholder="Your Zoom, Microsoft Teams or Google Meet room link" style={{ width: "100%", minHeight: 44, border: "1px solid var(--gray)", borderRadius: 8, padding: "8px 12px" }} />
              <span className="fine" style={{ textAlign: "left", display: "block" }}>Leave blank and each call gets its own private video room link automatically.</span>
            </div>
            <div className="field outlook-sync" style={{ marginTop: 18 }}>
              <label htmlFor="ics">Outlook calendar link (blocks your Outlook appointments)</label>
              <input id="ics" name="busy_ics_url" type="url" maxLength={1000} defaultValue={cal?.busy_ics_url || ""} placeholder="https://outlook.office365.com/owa/calendar/.../calendar.ics" />
              <span className="fine" style={{ textAlign: "left", display: "block" }}>
                {cal?.busy_ics_url
                  ? cal.busy_error ? <strong style={{ color: "#9a3412" }}>Last sync failed: {cal.busy_error}</strong>
                  : <>Synced {cal.busy_synced_at ? fmtDate(cal.busy_synced_at) + " ET" : "soon"}. {cal.n} upcoming Outlook busy {cal.n === 1 ? "time" : "times"} blocked. Syncs every 10 minutes.</>
                  : "Not connected. Prospects only see the hours above minus Labb meetings."}
              </span>
              <details className="outlook-how">
                <summary>How to get your Outlook calendar link</summary>
                <ol>
                  <li>Open Outlook on the web (outlook.office.com) and click the gear icon for <strong>Settings</strong>.</li>
                  <li>Go to <strong>Calendar</strong>, then <strong>Shared calendars</strong>.</li>
                  <li>Under <strong>Publish a calendar</strong>, choose <strong>Calendar</strong> and <strong>Can view when I&apos;m busy</strong>, then click <strong>Publish</strong>.</li>
                  <li>Copy the <strong>ICS</strong> link (it ends in .ics), paste it here and save.</li>
                </ol>
                <p className="fine" style={{ textAlign: "left" }}>&ldquo;Can view when I&apos;m busy&rdquo; shares only busy times, never meeting titles or attendees. Labb stores only the start and end times. Desktop Outlook uses the same calendar, so it all comes through. Keep the link private.</p>
              </details>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn btn-primary" type="submit">Save meeting hours</button>
              {cal?.busy_ics_url && <button className="linkish" type="submit" name="action" value="sync" formNoValidate>Sync Outlook now</button>}
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
