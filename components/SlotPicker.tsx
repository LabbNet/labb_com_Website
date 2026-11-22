"use client";

import { useEffect, useMemo, useState } from "react";

// Booking time picker: a month calendar on the left (days with open times are selectable), the open
// times for the chosen day on the right, shown in the visitor's own time zone. Writes the chosen
// slot to a hidden "start" input for the surrounding form.

const ZONES: [string, string][] = [
  ["America/New_York", "Eastern"],
  ["America/Chicago", "Central"],
  ["America/Denver", "Mountain"],
  ["America/Phoenix", "Arizona"],
  ["America/Los_Angeles", "Pacific"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
];
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const dayKey = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const hourIn = (d: Date, tz: string) => Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(d));
const clock = (d: Date, tz: string) => d.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
const longDay = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
const zoneName = (tz: string) => ZONES.find(([z]) => z === tz)?.[1] ?? tz.split("/").pop()!.replace(/_/g, " ");

export function SlotPicker({ slots, submitLabel, children }: { slots: string[]; submitLabel: string; children?: React.ReactNode }) {
  const [tz, setTz] = useState("America/New_York");
  useEffect(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (local) setTz(local);
  }, []);
  const times = useMemo(() => slots.map((s) => new Date(s)), [slots]);
  const byDay = useMemo(() => {
    const m = new Map<string, Date[]>();
    for (const t of times) {
      const k = dayKey(t, tz);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return m;
  }, [times, tz]);
  const days = [...byDay.keys()];
  const [day, setDay] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const activeDay = day && byDay.has(day) ? day : days[0] ?? null;

  // Months that contain open days.
  const months = useMemo(() => [...new Set(days.map((k) => k.slice(0, 7)))], [days]);
  const [mi, setMi] = useState(0);
  const month = months[Math.min(mi, months.length - 1)] ?? days[0]?.slice(0, 7);
  const today = dayKey(new Date(), tz);

  const grid = useMemo(() => {
    if (!month) return [];
    const [y, mo] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, mo - 1, 1));
    const n = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
    for (let d = 1; d <= n; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [month]);

  const list = activeDay ? byDay.get(activeDay)! : [];
  const groups: [string, Date[]][] = [
    ["Morning", list.filter((t) => hourIn(t, tz) < 12)],
    ["Afternoon", list.filter((t) => hourIn(t, tz) >= 12 && hourIn(t, tz) < 17)],
    ["Evening", list.filter((t) => hourIn(t, tz) >= 17)],
  ];
  const picked = pick ? new Date(pick) : null;
  const monthLabel = month ? new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" }) : "";
  const zones = ZONES.some(([z]) => z === tz) ? ZONES : [[tz, zoneName(tz)] as [string, string], ...ZONES];

  return (
    <div className="sp">
      <input type="hidden" name="start" value={pick ?? ""} />
      <div className="sp-card">
        <div className="sp-cal">
          <div className="sp-month">
            <button type="button" className="sp-nav" onClick={() => setMi((i) => Math.max(0, i - 1))} disabled={mi === 0} aria-label="Previous month">‹</button>
            <strong>{monthLabel}</strong>
            <button type="button" className="sp-nav" onClick={() => setMi((i) => Math.min(months.length - 1, i + 1))} disabled={mi >= months.length - 1} aria-label="Next month">›</button>
          </div>
          <div className="sp-grid" role="grid" aria-label="Choose a day">
            {WEEK.map((w) => <span key={w} className="sp-dow" aria-hidden="true">{w}</span>)}
            {grid.map((k, i) => {
              if (!k) return <span key={`e${i}`} />;
              const open = byDay.has(k);
              return (
                <button
                  key={k}
                  type="button"
                  className={`sp-day${open ? " open" : ""}${k === activeDay ? " on" : ""}${k === today ? " today" : ""}`}
                  disabled={!open}
                  aria-pressed={k === activeDay}
                  aria-label={`${longDay(k)}${open ? `, ${byDay.get(k)!.length} times open` : ", no times"}`}
                  onClick={() => { setDay(k); setPick(null); }}
                >
                  {Number(k.slice(8))}
                </button>
              );
            })}
          </div>
          <label className="sp-tz">
            <span>Time zone</span>
            <select value={tz} onChange={(e) => { setTz(e.target.value); setPick(null); setDay(null); }}>
              {zones.map(([z, l]) => <option key={z} value={z}>{l} time</option>)}
            </select>
          </label>
        </div>

        <div className="sp-times">
          {activeDay && <h3>{longDay(activeDay)}</h3>}
          <p className="sp-sub">30 minute video call · {zoneName(tz)} time</p>
          {groups.filter(([, g]) => g.length).map(([label, g]) => (
            <div key={label} className="sp-group">
              <span className="sp-glabel">{label}</span>
              <div className="sp-buttons">
                {g.map((t) => {
                  const iso = t.toISOString();
                  return (
                    <button key={iso} type="button" className={`sp-time${pick === iso ? " on" : ""}`} aria-pressed={pick === iso} onClick={() => setPick(iso)}>
                      {clock(t, tz)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {children}
      <div className={`sp-confirm${picked ? " ready" : ""}`} aria-live="polite">
        {picked ? (
          <p><span>Your call</span><strong>{longDay(dayKey(picked, tz))} at {clock(picked, tz)}</strong> <em>{zoneName(tz)} time</em></p>
        ) : (
          <p className="sp-hint">Pick a day, then a time.</p>
        )}
        <button className="btn btn-primary" type="submit" disabled={!picked}>{submitLabel}</button>
      </div>
    </div>
  );
}
