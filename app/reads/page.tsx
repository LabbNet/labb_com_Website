import Link from "next/link";
import { Flash } from "@/components/AdminBar";
import { readFlash } from "@/lib/admin";
import { easternToDate } from "@/lib/imageSize";
import { addDays, etParts, fmtDay, fmtTime, hrs, mondayOf, onCallNow, openSwaps, readTeam, requireReads, shiftsBetween, todayET } from "@/lib/reads";

const HOUR = 22; // pixels per hour in the week grid
const COLORS = ["#CF743C", "#4a78b5", "#3f8f6b", "#8a5fb0", "#c2453b", "#b7892a", "#2f8a9a", "#6b6f2a"];

// The on-call week: who is scheduled for reads, day and night, Monday to Sunday (Eastern time).
export default async function ReadsSchedule({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const a = await requireReads("/reads");
  const sp = await searchParams;
  const today = todayET();
  const start = mondayOf(sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const from = easternToDate(`${start}T00:00`)!;
  const to = easternToDate(`${addDays(start, 7)}T00:00`)!;
  const [shifts, now, teamAll, swaps, flash] = await Promise.all([shiftsBetween(from, to), onCallNow(), readTeam(), openSwaps(a.m.id), readFlash()]);
  const team = teamAll.filter((t) => t.status !== "disabled");
  const people = [...new Set(shifts.map((s) => s.member_id))];
  const color = (id: string) => COLORS[people.indexOf(id) % COLORS.length];
  const back = `/reads?week=${start}`;
  // Pending changes to an approved shift are listed with it, not drawn as a second shift.
  const drawn = shifts.filter((s) => !(s.status === "requested" && s.replaces_id));
  const listed = drawn.filter((s) => !s.auto_night);
  const nights = drawn.filter((s) => s.auto_night);
  const changes = shifts.filter((s) => s.status === "requested" && s.replaces_id);

  // Pieces of each shift inside each day column (a shift past midnight continues into the next day).
  const pieces = days.map((d) => {
    const dStart = easternToDate(`${d}T00:00`)!.getTime();
    const dEnd = easternToDate(`${addDays(d, 1)}T00:00`)!.getTime();
    const span = (dEnd - dStart) / 3600_000;
    return drawn
      .filter((s) => new Date(s.starts_at).getTime() < dEnd && new Date(s.ends_at).getTime() > dStart)
      .map((s) => {
        const top = (Math.max(new Date(s.starts_at).getTime(), dStart) - dStart) / 3600_000;
        const bottom = (Math.min(new Date(s.ends_at).getTime(), dEnd) - dStart) / 3600_000;
        return { s, top: (top / span) * 24, height: Math.max(((bottom - top) / span) * 24, 0.5), lane: 0, lanes: 1 };
      })
      .sort((x, y) => x.top - y.top);
  });
  // Side-by-side lanes when shifts overlap, so no one is hidden behind someone else.
  for (const day of pieces) {
    const ends: number[] = [];
    for (const p of day) {
      let lane = ends.findIndex((e) => e <= p.top + 0.001);
      if (lane === -1) { lane = ends.length; ends.push(0); }
      ends[lane] = p.top + p.height;
      p.lane = lane;
    }
    for (const p of day) p.lanes = day.filter((q) => q.top < p.top + p.height && p.top < q.top + q.height).reduce((m, q) => Math.max(m, q.lane + 1), p.lane + 1);
  }
  const mine = (memberId: string) => a.approver || memberId === a.m.id;
  const timeIn = (d: Date) => etParts(new Date(d)).time;

  return (
    <section className="section" style={{ paddingTop: 28 }}>
      <div className="wrap">
        <Flash flash={flash} />
        <div className="rd-oncall">
          <span className="rd-dot" aria-hidden="true" />
          {now.length ? <>On call now: <strong>{now.map((n) => `${n.name} until ${fmtTime(n.ends_at)}`).join(", ")}</strong></> : <>No one is on call right now.</>}
        </div>

        <div className="rd-weeknav">
          <Link href={`/reads?week=${addDays(start, -7)}`}>← Previous week</Link>
          <strong>{fmtDay(start)} to {fmtDay(addDays(start, 6))}</strong>
          <Link href={`/reads?week=${addDays(start, 7)}`}>Next week →</Link>
          {start !== mondayOf(today) && <Link href="/reads">This week</Link>}
        </div>

        <div className="rd-week" role="table" aria-label="On-call schedule">
          <div className="rd-hours" aria-hidden="true">
            <div className="rd-dayhead" />
            {Array.from({ length: 24 }, (_, h) => <div key={h} style={{ height: HOUR }}>{h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}</div>)}
          </div>
          {days.map((d, i) => (
            <div key={d} className={`rd-day${d === today ? " today" : ""}`} role="row">
              <div className="rd-dayhead" role="columnheader">{fmtDay(d)}</div>
              <div className="rd-col" style={{ height: HOUR * 24 }}>
                <div className="rd-night" style={{ top: 0, height: HOUR * 7 }} aria-hidden="true" />
                <div className="rd-night" style={{ top: HOUR * 21, height: HOUR * 3 }} aria-hidden="true" />
                {pieces[i].map(({ s, top, height, lane, lanes }) => (
                  <div key={`${s.id}-${d}`} className={`rd-shift${s.status === "requested" ? " pending" : ""}`} role="cell"
                    style={{ top: top * HOUR, height: height * HOUR - 2, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)`, right: "auto", background: s.status === "requested" ? "#fff" : color(s.member_id), borderColor: color(s.member_id), color: s.status === "requested" ? color(s.member_id) : "#fff" }}
                    title={`${s.name}: ${fmtTime(s.starts_at)} to ${fmtTime(s.ends_at)}${s.status === "requested" ? " (pending approval)" : ""}`}>
                    <strong>{s.name.split(" ")[0]}</strong>
                    {height * HOUR > 30 && <span>{fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="fine" style={{ textAlign: "left" }}>Solid blocks are approved. Outlined blocks are waiting for approval. Shaded hours, 9 PM to 7 AM, are night hours covered by Angela unless she assigns them. Times are Eastern.</p>

        {swaps.length > 0 && (
          <div id="swaps" className="hero-card rd-card" style={{ marginTop: 20 }}>
            <h2>Shift swaps</h2>
            <ul className="rd-list">
              {swaps.map((w) => (
                <li key={w.id} className="rd-swap">
                  <span>{w.to_id === a.m.id ? <><strong>{w.from_name}</strong> offered you</> : <>You offered <strong>{w.to_name}</strong></>} {fmtDay(etParts(new Date(w.starts_at)).date)}, {fmtTime(w.starts_at)} to {fmtTime(w.ends_at)}{w.note ? ` · ${w.note}` : ""}</span>
                  <form action="/api/reads" method="post" className="ct-assign">
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="back" value={back} />
                    {w.to_id === a.m.id ? <>
                      <button className="btn btn-primary btn-sm" type="submit" name="action" value="swap-accept">Accept</button>
                      <button className="linkish" type="submit" name="action" value="swap-decline">Decline</button>
                    </> : <button className="linkish" type="submit" name="action" value="swap-cancel">Cancel offer</button>}
                  </form>
                </li>
              ))}
            </ul>
            <p className="fine" style={{ margin: "8px 0 0" }}>A swap takes effect as soon as the other read admin accepts. Angela is notified.</p>
          </div>
        )}

        <div className="rd-grid">
          <div className="hero-card rd-card">
            <h2>Schedule a shift</h2>
            <form action="/api/reads" method="post" className="rd-form">
              <input type="hidden" name="action" value="add" />
              <input type="hidden" name="back" value={back} />
              {a.approver && (
                <div className="field"><label htmlFor="rd-m">Read admin</label>
                  <select id="rd-m" name="member" defaultValue={a.m.id}>{team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                </div>
              )}
              <div className="field"><label htmlFor="rd-d">Date</label><input id="rd-d" type="date" name="date" required defaultValue={today} /></div>
              <div className="rd-times">
                <div className="field"><label htmlFor="rd-s">Start</label><input id="rd-s" type="time" name="start" required defaultValue="08:00" {...(a.approver ? {} : { min: "07:00", max: "21:00" })} /></div>
                <div className="field"><label htmlFor="rd-e">End</label><input id="rd-e" type="time" name="end" required defaultValue="17:00" {...(a.approver ? {} : { min: "07:00", max: "21:00" })} /></div>
              </div>
              <div className="field"><label htmlFor="rd-n">Note (optional)</label><input id="rd-n" name="note" maxLength={300} /></div>
              <button className="btn btn-primary" type="submit">{a.approver ? "Schedule" : "Request shift"}</button>
              <p className="fine" style={{ margin: 0 }}>{a.approver ? "An end time earlier than the start runs past midnight. Your shifts and changes take effect right away." : "Choose times between 7 AM and 9 PM; night hours are Angela's. Angela approves each request, and you'll get an email when she does."}</p>
            </form>
          </div>

          <div className="rd-card-list">
            <h2>Shifts this week</h2>
            {!listed.length && <p className="hero-card">No day shifts scheduled this week.</p>}
            <ul className="rd-list">
              {[...listed, ...(a.approver ? nights : [])].map((s) => {
                const ch = changes.filter((c) => c.replaces_id === s.id);
                const st = etParts(new Date(s.starts_at));
                const hours = (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 3600_000;
                return (
                  <li key={s.id} className="hero-card">
                    <div className="rd-li-head">
                      {s.auto_night && <span className="status">Night hours</span>}
                      <span className="rd-swatch" style={{ background: color(s.member_id) }} aria-hidden="true" />
                      <strong>{s.name}</strong>
                      <span>{fmtDay(st.date)}, {fmtTime(s.starts_at)} to {fmtTime(s.ends_at)}</span>
                      <span className="fine">{hrs(hours)} h</span>
                      {s.status === "requested" && <span className="status s-contacted">Pending approval</span>}
                    </div>
                    {s.note && <p className="fine" style={{ margin: "4px 0 0", textAlign: "left" }}>{s.note}</p>}
                    {ch.map((c) => (
                      <p key={c.id} className="fine rd-change">
                        {c.action === "remove" ? "Removal requested" : `Change requested to ${fmtDay(etParts(new Date(c.starts_at)).date)}, ${fmtTime(c.starts_at)} to ${fmtTime(c.ends_at)}`}{c.requested_by_name ? ` by ${c.requested_by_name}` : ""}, waiting for approval.
                      </p>
                    ))}
                    {mine(s.member_id) && (
                      <details className="rd-edit">
                        <summary>Change or remove</summary>
                        <form action="/api/reads" method="post" className="rd-form rd-inline">
                          <input type="hidden" name="action" value="change" />
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="back" value={back} />
                          <label>Date <input type="date" name="date" required defaultValue={st.date} /></label>
                          <label>Start <input type="time" name="start" required defaultValue={timeIn(s.starts_at)} /></label>
                          <label>End <input type="time" name="end" required defaultValue={timeIn(s.ends_at)} /></label>
                          {a.approver && (
                            <label>Read admin
                              <select name="member" defaultValue={s.member_id}>{team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                            </label>
                          )}
                          <label>Note <input name="note" maxLength={300} placeholder="Why the change" /></label>
                          <button className="btn btn-outline-dark btn-sm" type="submit">{a.approver || s.status === "requested" ? "Save" : "Request change"}</button>
                        </form>
                        <form action="/api/reads" method="post">
                          <input type="hidden" name="action" value="remove" />
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="back" value={back} />
                          <button className="linkish" type="submit">{a.approver || s.status === "requested" ? "Remove shift" : "Request removal"}</button>
                        </form>
                        {s.status === "approved" && (a.approver || !s.auto_night) && (
                          <form action="/api/reads" method="post" className="rd-form rd-inline">
                            <input type="hidden" name="action" value="swap-offer" />
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="back" value={back} />
                            <label>Give this shift to
                              <select name="to" required defaultValue="">
                                <option value="" disabled>Choose a read admin</option>
                                {team.filter((t) => t.id !== s.member_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </label>
                            <label>Note <input name="note" maxLength={300} /></label>
                            <button className="btn btn-outline-dark btn-sm" type="submit">Offer swap</button>
                          </form>
                        )}
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
