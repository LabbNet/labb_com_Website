import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { addDays, etDate, etMinutes, fmtClock, hoursFor, kindInfo, MEETING_STATUS, meetingHosts, minToClock } from "@/lib/meetings";

export const metadata: Metadata = { title: "Calendar", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const START = 7 * 60, END = 20 * 60, SPAN = END - START; // 7 AM to 8 PM Eastern
const TIMES = Array.from({ length: (END - START) / 30 + 1 }, (_, i) => START + i * 30);
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// The source of truth for when leads can book: weekly hours, meetings, connected calendar busy times and days blocked by hand.
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ who?: string; week?: string }> }) {
  const me = await requireAdmin("/admin/calendar");
  const sp = await searchParams;
  const db = sql();
  const [hosts, flash, [{ superadmin }]] = await Promise.all([meetingHosts(), readFlash(), db<{ superadmin: boolean }[]>`select superadmin from members where id = ${me.id}`]);
  const admins = await db<{ id: string; name: string }[]>`select id, name from members where role = 'admin' and status <> 'disabled' order by name`;
  const who = superadmin && sp.who && admins.some((a) => a.id === sp.who) ? sp.who : me.id;
  const person = admins.find((a) => a.id === who) ?? { id: me.id, name: me.name };
  const today = etDate(new Date());
  const base = sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : today;
  const dow = new Date(`${base}T12:00:00Z`).getUTCDay();
  const monday = addDays(base, dow === 0 ? -6 : 1 - dow);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const from = new Date(`${addDays(monday, -1)}T00:00:00Z`), to = new Date(`${addDays(monday, 8)}T00:00:00Z`);
  const [hours, meetings, busy, blocks, [cal]] = await Promise.all([
    hoursFor(who),
    db<{ id: string; kind: string; status: string; starts_at: Date; ends_at: Date; room_url: string; notify_lead: boolean; lead_id: string; first_name: string | null; last_name: string | null; company: string | null; email: string }[]>`
      select g.id, g.kind, g.status, g.starts_at, g.ends_at, g.room_url, g.notify_lead, l.id as lead_id, l.first_name, l.last_name, l.company, l.email
      from lead_meetings g join leads l on l.id = g.lead_id where g.host_id = ${who} and g.status <> 'cancelled' and g.starts_at < ${to} and g.ends_at > ${from} order by g.starts_at`,
    db<{ starts_at: Date; ends_at: Date }[]>`select starts_at, ends_at from host_busy where host_id = ${who} and starts_at < ${to} and ends_at > ${from}`.catch(() => []),
    db<{ id: string; starts_at: Date; ends_at: Date; note: string | null }[]>`select id, starts_at, ends_at, note from host_blocks where host_id = ${who} and starts_at < ${to} and ends_at > ${from} order by starts_at`,
    db<{ busy_ics_url: string | null; busy_synced_at: Date | null; busy_error: string | null }[]>`select busy_ics_url, busy_synced_at, busy_error from members where id = ${who}`,
  ]);
  const upcomingBlocks = await db<{ id: string; starts_at: Date; ends_at: Date; note: string | null }[]>`select id, starts_at, ends_at, note from host_blocks where host_id = ${who} and ends_at > now() order by starts_at limit 60`;

  // Place anything on a day column (clipped to the visible hours).
  const place = (s: Date, e: Date, day: string) => {
    if (etDate(s) !== day && etDate(e) !== day && !(etDate(s) < day && etDate(e) > day)) return null;
    const a = etDate(s) < day ? 0 : etMinutes(s), b = etDate(e) > day ? 1440 : etMinutes(e);
    const top = Math.max(a, START), bot = Math.min(b, END);
    if (bot <= top) return null;
    return { top: ((top - START) / SPAN) * 100, height: ((bot - top) / SPAN) * 100, label: a === 0 && b >= 1440 ? "All day" : `${minToClock(a)}${b < 1440 ? `–${minToClock(b)}` : ""}` };
  };
  const q = (extra: Record<string, string>) => `/admin/calendar?${new URLSearchParams({ ...(who !== me.id ? { who } : {}), ...extra })}`;
  const hidden = <><input type="hidden" name="who" value={who} /><input type="hidden" name="week" value={monday} /></>;
  const isHost = hosts.some((h) => h.id === who);

  return (
    <>
      <AdminBar title="Calendar" current="/admin/calendar" />
      <section className="section cal" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <div className="cal-head">
            <div>
              <h1>{person.id === me.id ? "My calendar" : `${person.name}'s calendar`}</h1>
              <p className="fine" style={{ textAlign: "left", margin: 0 }}>This is what leads can book. Open times are your weekly meeting hours, minus meetings, your connected calendar&apos;s busy times (with 15 minutes either side) and time you block here. Times are Eastern.</p>
            </div>
            <div className="cal-nav">
              {superadmin && (
                <form method="get" action="/admin/calendar" className="cal-who">
                  <select name="who" defaultValue={who} aria-label="Whose calendar">{admins.map((a) => <option key={a.id} value={a.id}>{a.id === me.id ? `Me (${a.name})` : a.name}</option>)}</select>
                  <input type="hidden" name="week" value={monday} />
                  <button className="btn btn-outline-dark btn-sm" type="submit">Show</button>
                </form>
              )}
              <Link className="btn btn-outline-dark btn-sm" href={q({ week: addDays(monday, -7) })}>&larr; Week</Link>
              <Link className="btn btn-outline-dark btn-sm" href={q({})}>This week</Link>
              <Link className="btn btn-outline-dark btn-sm" href={q({ week: addDays(monday, 7) })}>Week &rarr;</Link>
            </div>
          </div>
          {!isHost && <p className="hero-card" style={{ textAlign: "left", padding: "12px 16px" }}>No weekly meeting hours are set, so leads can&apos;t book {person.id === me.id ? "you" : person.name} yet. <Link href={`/admin/meetings${who !== me.id ? `?who=${who}` : ""}#hours`}>Set meeting hours</Link>.</p>}

          <div className="cal-legend"><span className="lg-open">Open for booking</span><span className="lg-mtg">Meeting</span><span className="lg-busy">Busy on your calendar</span><span className="lg-block">Blocked</span><span className="lg-off">Outside meeting hours</span></div>
          <div className="cal-grid">
            <div className="cal-times">{TIMES.filter((t) => t % 60 === 0).map((t) => <span key={t} style={{ top: `${((t - START) / SPAN) * 100}%` }}>{minToClock(t).replace(":00", "")}</span>)}</div>
            {days.map((d) => {
              const dw = new Date(`${d}T12:00:00Z`).getUTCDay();
              const open = hours.filter((h) => h.dow === dw);
              return (
                <div key={d} className={`cal-day${d === today ? " today" : ""}${d < today ? " past" : ""}`}>
                  <div className="cal-dh">{new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}</div>
                  <div className="cal-col">
                    {open.map((h, i) => { const top = Math.max(h.start_min, START), bot = Math.min(h.end_min, END); return bot > top ? <div key={`o${i}`} className="cal-open" style={{ top: `${((top - START) / SPAN) * 100}%`, height: `${((bot - top) / SPAN) * 100}%` }} /> : null; })}
                    {busy.map((b, i) => { const p = place(new Date(b.starts_at), new Date(b.ends_at), d); return p && <div key={`b${i}`} className="cal-ev cal-busy" style={{ top: `${p.top}%`, height: `${p.height}%` }}><span>Busy · {p.label}</span></div>; })}
                    {blocks.map((b) => { const p = place(new Date(b.starts_at), new Date(b.ends_at), d); return p && <div key={`k${b.id}`} className="cal-ev cal-block" style={{ top: `${p.top}%`, height: `${p.height}%` }}><span>Blocked{b.note ? `: ${b.note}` : ""} · {p.label}</span></div>; })}
                    {meetings.map((g) => { const p = place(new Date(g.starts_at), new Date(g.ends_at), d); return p && (
                      <Link key={`m${g.id}`} href={`/admin/leads/${g.lead_id}?tab=meetings`} className={`cal-ev cal-mtg cal-${g.status}`} style={{ top: `${p.top}%`, height: `${p.height}%` }}>
                        <span><strong>{g.company || [g.first_name, g.last_name].filter(Boolean).join(" ") || g.email}</strong> · {kindInfo(g.kind).label} · {fmtClock(g.starts_at)}{g.status !== "booked" ? ` · ${MEETING_STATUS[g.status]}` : ""}</span>
                      </Link>
                    ); })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cal-cards">
            <div className="hero-card">
              <h2>Block time off</h2>
              <p className="fine" style={{ textAlign: "left" }}>Leads can&apos;t book blocked time. Block part of a day, a whole day, or a run of days (vacation, a trade show).</p>
              <form action="/api/admin/calendar" method="post" className="cal-form">
                <input type="hidden" name="action" value="block" />{hidden}
                <div className="field"><label htmlFor="b-date">From</label><input id="b-date" type="date" name="date" required min={today} defaultValue={today} /></div>
                <div className="field"><label htmlFor="b-to">Through (optional)</label><input id="b-to" type="date" name="to" min={today} /></div>
                <div className="field"><label htmlFor="b-s">Start</label><select id="b-s" name="start" defaultValue="12:00">{TIMES.map((t) => <option key={t} value={hhmm(t)}>{minToClock(t)}</option>)}</select></div>
                <div className="field"><label htmlFor="b-e">End</label><select id="b-e" name="end" defaultValue="13:00">{TIMES.map((t) => <option key={t} value={hhmm(t)}>{minToClock(t)}</option>)}</select></div>
                <label className="sm-check"><input type="checkbox" name="all_day" value="1" /> All day</label>
                <div className="field cal-wide"><label htmlFor="b-n">Note (only the team sees it)</label><input id="b-n" name="note" maxLength={200} placeholder="Dentist, trade show, out of office" /></div>
                <div className="cal-wide"><button className="btn btn-primary" type="submit">Block it</button></div>
              </form>
              {upcomingBlocks.length > 0 && (
                <ul className="cal-blocks">
                  {upcomingBlocks.map((b) => (
                    <li key={b.id}>
                      <span><strong>{new Date(b.starts_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" })}</strong> {etMinutes(new Date(b.starts_at)) === 0 && etMinutes(new Date(b.ends_at)) === 0 ? "All day" : `${fmtClock(b.starts_at)}–${fmtClock(b.ends_at)}`}{b.note ? ` · ${b.note}` : ""}</span>
                      <form action="/api/admin/calendar" method="post"><input type="hidden" name="action" value="unblock" /><input type="hidden" name="block" value={b.id} />{hidden}<button className="linkish" type="submit">Remove</button></form>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hero-card">
              <h2>Connect Outlook or Gmail</h2>
              <p className="fine" style={{ textAlign: "left" }}>Paste your calendar&apos;s private ICS address. Labb reads only busy times (never titles or details), every 10 minutes, and keeps those times closed with 15 minutes either side.</p>
              <ul className="fine cal-how">
                <li><strong>Outlook:</strong> Settings, Calendar, Shared calendars, Publish a calendar. Choose your calendar and &ldquo;Can view when I&apos;m busy&rdquo;, select Publish, then copy the ICS link.</li>
                <li><strong>Gmail (Google Calendar):</strong> Settings, select your calendar under &ldquo;Settings for my calendars&rdquo;, then copy &ldquo;Secret address in iCal format&rdquo;.</li>
              </ul>
              <form action="/api/admin/calendar" method="post" className="cal-form">
                <input type="hidden" name="action" value="ics" />{hidden}
                <div className="field cal-wide"><label htmlFor="c-ics">Calendar ICS address</label><input id="c-ics" name="busy_ics_url" defaultValue={cal?.busy_ics_url || ""} placeholder="https://outlook.office365.com/owa/calendar/.../calendar.ics or https://calendar.google.com/calendar/ical/.../basic.ics" /></div>
                <div className="cal-wide btn-row" style={{ justifyContent: "flex-start" }}><button className="btn btn-primary" type="submit">{cal?.busy_ics_url ? "Save" : "Connect"}</button></div>
              </form>
              {cal?.busy_ics_url && (
                <form action="/api/admin/calendar" method="post" style={{ marginTop: 8 }}>
                  <input type="hidden" name="action" value="sync" />{hidden}
                  <span className="fine">{cal.busy_error ? `Last sync failed: ${cal.busy_error}` : cal.busy_synced_at ? `Last synced ${new Date(cal.busy_synced_at).toLocaleString("en-US", { timeZone: "America/New_York" })} ET.` : "Not synced yet."} </span>
                  <button className="linkish" type="submit">Sync now</button>
                </form>
              )}
              <p className="fine" style={{ textAlign: "left", marginTop: 12 }}>Weekly meeting hours and your video link are on <Link href={`/admin/meetings${who !== me.id ? `?who=${who}` : ""}#hours`}>Meetings</Link>.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
