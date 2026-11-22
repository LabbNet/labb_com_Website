import Link from "next/link";
import { Flash } from "@/components/AdminBar";
import { readFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { addDays, fmtDay, hrs, hoursBetween, mondayOf, readTeam, requireReads, todayET } from "@/lib/reads";

// Pay card: hours from the approved schedule, plus approved changes. Read admins see their own; super read
// admins see everyone's and can export them for payroll.
export default async function ReadsHours({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; who?: string }> }) {
  const a = await requireReads("/reads/hours");
  const sp = await searchParams;
  const today = todayET();
  const ok = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const monthStart = `${today.slice(0, 7)}-01`;
  const from = ok(sp.from) || monthStart;
  const to = ok(sp.to) || today;
  const who = a.superRead ? (sp.who && /^[0-9a-f-]{36}$/.test(sp.who) ? sp.who : null) : a.m.id;
  const team = a.superRead ? await readTeam() : [];
  const [rows, adjustments, flash] = await Promise.all([
    hoursBetween(from, to, who),
    sql()<{ id: string; name: string; work_date: Date; hours: string; reason: string; status: string; requested_by_name: string | null; decided_by_name: string | null }[]>`
      select a.id, m.name, a.work_date, a.hours, a.reason, a.status, rb.name as requested_by_name, db.name as decided_by_name
      from read_adjustments a join members m on m.id = a.member_id left join members rb on rb.id = a.requested_by left join members db on db.id = a.decided_by
      where a.work_date between ${from}::date and ${to}::date and (${who === null} or a.member_id = ${who}) order by a.work_date desc, a.created_at desc`,
    readFlash(),
  ]);
  const people = [...new Map(rows.map((r) => [r.member_id, r.name])).entries()];
  const sum = (id: string | null, k: "scheduled" | "adjusted" | "pending") => rows.filter((r) => id === null || r.member_id === id).reduce((t, r) => t + r[k], 0);
  const lastMonthEnd = addDays(monthStart, -1);
  const presets: [string, string, string][] = [
    ["This week", mondayOf(today), today],
    ["Last week", addDays(mondayOf(today), -7), addDays(mondayOf(today), -1)],
    ["This month", monthStart, today],
    ["Last month", `${lastMonthEnd.slice(0, 7)}-01`, lastMonthEnd],
  ];
  const q = (f: string, t: string, w = sp.who) => `/reads/hours?from=${f}&to=${t}${w ? `&who=${w}` : ""}`;
  const single = who !== null || !a.superRead;
  const back = q(from, to);

  return (
    <section className="section" style={{ paddingTop: 28 }}>
      <div className="wrap">
        <Flash flash={flash} />
        <form className="rd-range" action="/reads/hours">
          {presets.map(([l, f, t]) => <Link key={l} href={q(f, t)} aria-current={f === from && t === to ? "true" : undefined}>{l}</Link>)}
          <label>From <input type="date" name="from" defaultValue={from} /></label>
          <label>To <input type="date" name="to" defaultValue={to} /></label>
          {a.superRead && (
            <select name="who" defaultValue={sp.who || "all"} aria-label="Read admin">
              <option value="all">Everyone</option>
              {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <button className="btn btn-outline-dark btn-sm" type="submit">Show</button>
          {a.superRead && <a className="btn btn-outline-dark btn-sm" href={`/api/reads/export?from=${from}&to=${to}${who ? `&who=${who}` : ""}`}>Download CSV</a>}
        </form>

        <div className="an-kpis an-kpis-3" style={{ marginBottom: 20 }}>
          <div className="an-kpi"><span className="an-kpi-label">Scheduled hours</span><strong>{hrs(sum(null, "scheduled"))}</strong><span className="fine">Approved shifts, {fmtDay(from)} to {fmtDay(to)}</span></div>
          <div className="an-kpi"><span className="an-kpi-label">Approved changes</span><strong>{sum(null, "adjusted") > 0 ? "+" : ""}{hrs(sum(null, "adjusted"))}</strong><span className="fine">{sum(null, "pending") ? `${hrs(sum(null, "pending"))} h waiting for approval` : "Nothing waiting"}</span></div>
          <div className="an-kpi"><span className="an-kpi-label">Hours to be paid</span><strong>{hrs(sum(null, "scheduled") + sum(null, "adjusted"))}</strong><span className="fine">Scheduled plus approved changes</span></div>
        </div>

        {!single && (
          <div className="bg-table-wrap" style={{ marginBottom: 24 }}>
            <table className="bg-table">
              <thead><tr><th scope="col">Read admin</th><th scope="col">Scheduled</th><th scope="col">Approved changes</th><th scope="col">Waiting</th><th scope="col">To be paid</th></tr></thead>
              <tbody>
                {people.map(([id, name]) => (
                  <tr key={id}>
                    <th scope="row"><Link href={q(from, to, id)}>{name}</Link></th>
                    <td>{hrs(sum(id, "scheduled"))}</td><td>{hrs(sum(id, "adjusted"))}</td><td>{sum(id, "pending") ? hrs(sum(id, "pending")) : ""}</td>
                    <td><strong>{hrs(sum(id, "scheduled") + sum(id, "adjusted"))}</strong></td>
                  </tr>
                ))}
                {!people.length && <tr><td colSpan={5}>No hours in this range.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {single && (
          <div className="bg-table-wrap" style={{ marginBottom: 24 }}>
            <table className="bg-table">
              <thead><tr><th scope="col">Day</th><th scope="col">Shifts</th><th scope="col">Scheduled</th><th scope="col">Approved changes</th><th scope="col">Waiting</th><th scope="col">To be paid</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.member_id}-${r.day}`}>
                    <th scope="row">{fmtDay(r.day)}{a.superRead ? ` · ${r.name}` : ""}</th>
                    <td>{r.shifts || ""}</td><td>{hrs(r.scheduled)}</td><td>{r.adjusted ? hrs(r.adjusted) : ""}</td><td>{r.pending ? hrs(r.pending) : ""}</td>
                    <td><strong>{hrs(r.scheduled + r.adjusted)}</strong></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={6}>No hours in this range.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <div className="rd-grid">
          <div className="hero-card rd-card">
            <h2>Change hours on the pay card</h2>
            <form action="/api/reads" method="post" className="rd-form">
              <input type="hidden" name="action" value="adjust" />
              <input type="hidden" name="back" value={back} />
              {a.approver && (
                <div className="field"><label htmlFor="adj-m">Read admin</label>
                  <select id="adj-m" name="member" defaultValue={who || a.m.id}>{team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                </div>
              )}
              <div className="field"><label htmlFor="adj-d">Date worked</label><input id="adj-d" type="date" name="date" required defaultValue={today} /></div>
              <div className="field"><label htmlFor="adj-h">Hours to add or remove</label><input id="adj-h" name="hours" inputMode="decimal" required placeholder="1.5 or -2" /></div>
              <div className="field"><label htmlFor="adj-r">Reason</label><input id="adj-r" name="reason" required maxLength={500} placeholder="Stayed late for a backlog" /></div>
              <button className="btn btn-primary" type="submit">{a.approver ? "Change hours" : "Request change"}</button>
              <p className="fine" style={{ margin: 0 }}>Use this only when paid hours should differ from the schedule. If you swapped or moved a shift, change the shift on the schedule instead. {a.approver ? "" : "Angela approves every change."}</p>
            </form>
          </div>
          <div className="rd-card-list">
            <h2>Hour changes</h2>
            {!adjustments.length ? <p className="hero-card">No changes in this range.</p> : (
              <ul className="rd-list">
                {adjustments.map((x) => (
                  <li key={x.id} className="hero-card">
                    <div className="rd-li-head">
                      <strong>{Number(x.hours) > 0 ? "+" : ""}{hrs(Number(x.hours))} h</strong>
                      <span>{fmtDay(new Date(x.work_date).toISOString().slice(0, 10))}{a.superRead ? ` · ${x.name}` : ""}</span>
                      <span className={`status ${x.status === "approved" ? "s-won" : x.status === "declined" ? "s-lost" : "s-contacted"}`}>{x.status === "requested" ? "Waiting for approval" : x.status}</span>
                    </div>
                    <p className="fine" style={{ margin: "4px 0 0", textAlign: "left" }}>{x.reason}{x.requested_by_name ? ` · requested by ${x.requested_by_name}` : ""}{x.decided_by_name && x.status !== "requested" ? ` · ${x.status} by ${x.decided_by_name}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
