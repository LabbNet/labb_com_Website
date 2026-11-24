// Minimal iCalendar (.ics) reader for busy times: events with times, time zones (IANA or Windows names),
// all-day events, recurring events (RRULE with EXDATE and moved occurrences) and free/cancelled events skipped.
// Returns busy intervals only. No summaries or attendees are kept.

const WIN_TZ: Record<string, string> = {
  "Eastern Standard Time": "America/New_York", "US Eastern Standard Time": "America/Indiana/Indianapolis",
  "Central Standard Time": "America/Chicago", "Mountain Standard Time": "America/Denver", "US Mountain Standard Time": "America/Phoenix",
  "Pacific Standard Time": "America/Los_Angeles", "Alaskan Standard Time": "America/Anchorage", "Hawaiian Standard Time": "Pacific/Honolulu",
  "Atlantic Standard Time": "America/Halifax", "Newfoundland Standard Time": "America/St_Johns", "Central America Standard Time": "America/Guatemala",
  "Central Standard Time (Mexico)": "America/Mexico_City", "SA Pacific Standard Time": "America/Bogota", "Canada Central Standard Time": "America/Regina",
  "UTC": "UTC", "Coordinated Universal Time": "UTC", "GMT Standard Time": "Europe/London", "Greenwich Standard Time": "Atlantic/Reykjavik",
  "W. Europe Standard Time": "Europe/Berlin", "Romance Standard Time": "Europe/Paris", "Central Europe Standard Time": "Europe/Budapest",
  "India Standard Time": "Asia/Kolkata", "China Standard Time": "Asia/Shanghai", "Tokyo Standard Time": "Asia/Tokyo", "AUS Eastern Standard Time": "Australia/Sydney",
};

function zone(tzid: string | undefined, fallback: string) {
  if (!tzid) return fallback;
  const t = tzid.replace(/^"|"$/g, "").replace(/^\/.*?\//, "");
  const z = WIN_TZ[t] || t;
  try { new Intl.DateTimeFormat("en-US", { timeZone: z }); return z; } catch { return fallback; }
}

function offsetMin(d: Date, tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - d.getTime()) / 60000);
}
// Wall clock in a zone -> instant.
function wallToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const t1 = guess - offsetMin(new Date(guess), tz) * 60000;
  return new Date(guess - offsetMin(new Date(t1), tz) * 60000);
}

type Wall = { y: number; mo: number; d: number; h: number; mi: number; s: number };
type Stamp = { wall: Wall; tz: string; utc: boolean; allDay: boolean };

function parseStamp(value: string, params: Record<string, string>, fallbackTz: string): Stamp | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const allDay = !m[4] || params.VALUE === "DATE";
  return {
    wall: { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : 0, mi: m[5] ? +m[5] : 0, s: m[6] ? +m[6] : 0 },
    tz: m[7] ? "UTC" : zone(params.TZID, fallbackTz), utc: !!m[7], allDay,
  };
}
const toDate = (st: Stamp, w: Wall = st.wall) => (st.utc ? new Date(Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s)) : wallToUtc(w.y, w.mo, w.d, w.h, w.mi, w.s, st.tz));

function parseDuration(v: string) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim());
  if (!m) return 0;
  return ((+(m[2] || 0) * 7 + +(m[3] || 0)) * 86400 + +(m[4] || 0) * 3600 + +(m[5] || 0) * 60 + +(m[6] || 0)) * 1000 * (m[1] === "-" ? -1 : 1);
}

type Prop = { name: string; params: Record<string, string>; value: string };
function lines(text: string): Prop[] {
  const raw = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const out: Prop[] = [];
  for (const l of raw) {
    const i = l.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    if (i < 0) continue;
    const [head, ...ps] = l.slice(0, i).split(";");
    const params: Record<string, string> = {};
    for (const p of ps) { const j = p.indexOf("="); if (j > 0) params[p.slice(0, j).toUpperCase()] = p.slice(j + 1); }
    out.push({ name: head.toUpperCase(), params, value: l.slice(i + 1) });
  }
  return out;
}

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const addDaysWall = (w: Wall, n: number): Wall => { const t = new Date(Date.UTC(w.y, w.mo - 1, w.d + n)); return { ...w, y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
const dowOf = (w: Wall) => new Date(Date.UTC(w.y, w.mo - 1, w.d)).getUTCDay();
const daysInMonth = (y: number, mo: number) => new Date(Date.UTC(y, mo, 0)).getUTCDate();

// Wall-clock start times of a recurring event, from DTSTART up to `until`.
function expand(start: Stamp, rule: string, until: Date, max = 2000): Wall[] {
  const r = Object.fromEntries(rule.split(";").map((x) => x.split("=")).filter((x) => x.length === 2).map(([k, v]) => [k.toUpperCase(), v]));
  const freq = r.FREQ;
  const interval = Math.max(1, +(r.INTERVAL || 1));
  const count = r.COUNT ? +r.COUNT : Infinity;
  const untilR = r.UNTIL ? parseStamp(r.UNTIL, {}, start.tz) : null;
  const end = untilR ? new Date(Math.min(toDate(untilR).getTime() + (untilR.allDay ? 86399000 : 0), until.getTime())) : until;
  const byday = (r.BYDAY || "").split(",").filter(Boolean).map((x) => { const m = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(x); return m ? { n: m[1] ? +m[1] : 0, dow: DAYS.indexOf(m[2]) } : null; }).filter(Boolean) as { n: number; dow: number }[];
  const bymonthday = (r.BYMONTHDAY || "").split(",").filter(Boolean).map(Number);
  const out: Wall[] = [];
  const s = start.wall;
  const push = (w: Wall) => {
    const t = toDate(start, w);
    if (t < toDate(start)) return true;
    if (t > end || out.length >= count) return false;
    out.push(w);
    return out.length < max;
  };
  if (freq === "DAILY") {
    for (let i = 0; ; i += interval) { const w = addDaysWall(s, i); if (byday.length && !byday.some((b) => b.dow === dowOf(w))) continue; if (!push(w)) break; if (i > 3660) break; }
  } else if (freq === "WEEKLY") {
    const days = byday.length ? byday.map((b) => b.dow).sort((a, b) => a - b) : [dowOf(s)];
    const weekStart = addDaysWall(s, -dowOf(s));
    outer: for (let wk = 0; wk < 600; wk += interval) {
      for (const d of days) { if (!push(addDaysWall(weekStart, wk * 7 + d))) break outer; }
    }
  } else if (freq === "MONTHLY" || freq === "YEARLY") {
    const step = freq === "MONTHLY" ? interval : interval * 12;
    outer: for (let k = 0; k < 600; k += step) {
      const t = new Date(Date.UTC(s.y, s.mo - 1 + k, 1));
      const y = t.getUTCFullYear(), mo = t.getUTCMonth() + 1;
      if (freq === "YEARLY" && r.BYMONTH && !r.BYMONTH.split(",").map(Number).includes(mo)) continue;
      const dim = daysInMonth(y, mo);
      let ds: number[] = [];
      if (byday.length) {
        for (const b of byday) {
          const all: number[] = [];
          for (let d = 1; d <= dim; d++) if (new Date(Date.UTC(y, mo - 1, d)).getUTCDay() === b.dow) all.push(d);
          if (!b.n) ds.push(...all); else { const pick = b.n > 0 ? all[b.n - 1] : all[all.length + b.n]; if (pick) ds.push(pick); }
        }
        if (r.BYSETPOS) { const sorted = [...ds].sort((a, b) => a - b); const pos = +r.BYSETPOS; ds = [pos > 0 ? sorted[pos - 1] : sorted[sorted.length + pos]].filter(Boolean); }
      } else if (bymonthday.length) {
        ds = bymonthday.map((d) => (d < 0 ? dim + d + 1 : d)).filter((d) => d >= 1 && d <= dim);
      } else if (s.d <= dim) ds = [s.d];
      for (const d of ds.sort((a, b) => a - b)) if (!push({ ...s, y, mo, d })) break outer;
    }
  } else {
    push(s);
  }
  return out;
}

export type Busy = { start: Date; end: Date };

// Busy intervals that overlap [from, to].
export function busyFromIcs(text: string, from: Date, to: Date, fallbackTz = "America/New_York"): Busy[] {
  const props = lines(text);
  let calTz = fallbackTz;
  const xwr = props.find((p) => p.name === "X-WR-TIMEZONE");
  if (xwr) calTz = zone(xwr.value, fallbackTz);
  type Ev = { uid: string; start?: Stamp; end?: Stamp; dur?: number; rrule?: string; exdates: number[]; recurrenceId?: number; free: boolean };
  const events: Ev[] = [];
  let cur: Ev | null = null;
  let depth = 0;
  for (const p of props) {
    if (p.name === "BEGIN" && p.value.toUpperCase() === "VEVENT") { cur = { uid: "", exdates: [], free: false }; depth = 0; continue; }
    if (!cur) continue;
    if (p.name === "BEGIN") { depth++; continue; }
    if (p.name === "END") { if (depth) { depth--; continue; } if (p.value.toUpperCase() === "VEVENT") { events.push(cur); cur = null; } continue; }
    if (depth) continue; // inside VALARM
    switch (p.name) {
      case "UID": cur.uid = p.value; break;
      case "DTSTART": cur.start = parseStamp(p.value, p.params, calTz) ?? undefined; break;
      case "DTEND": cur.end = parseStamp(p.value, p.params, calTz) ?? undefined; break;
      case "DURATION": cur.dur = parseDuration(p.value); break;
      case "RRULE": cur.rrule = p.value; break;
      case "EXDATE": for (const v of p.value.split(",")) { const st = parseStamp(v, p.params, calTz); if (st) cur.exdates.push(toDate(st).getTime()); } break;
      case "RECURRENCE-ID": { const st = parseStamp(p.value, p.params, calTz); if (st) cur.recurrenceId = toDate(st).getTime(); break; }
      case "TRANSP": if (p.value.toUpperCase() === "TRANSPARENT") cur.free = true; break;
      case "X-MICROSOFT-CDO-BUSYSTATUS": if (p.value.toUpperCase() === "FREE") cur.free = true; else cur.free = false; break;
      case "STATUS": if (p.value.toUpperCase() === "CANCELLED") cur.free = true; break;
    }
  }
  // Moved or cancelled single occurrences of a series.
  const overrides = new Map<string, Set<number>>();
  for (const e of events) if (e.recurrenceId !== undefined) { const s = overrides.get(e.uid) ?? new Set(); s.add(e.recurrenceId); overrides.set(e.uid, s); }

  const out: Busy[] = [];
  const add = (s: Date, e: Date) => { if (e > from && s < to && e > s) out.push({ start: s, end: e }); };
  for (const e of events) {
    if (!e.start || e.free) continue;
    const st = e.start;
    const len = e.end ? toDate(e.end).getTime() - toDate(st).getTime() : e.dur ?? (st.allDay ? 86400000 : 0);
    if (e.rrule && e.recurrenceId === undefined) {
      const skip = new Set([...e.exdates, ...(overrides.get(e.uid) ?? [])]);
      for (const w of expand(st, e.rrule, to)) {
        const s = toDate(st, w);
        if (skip.has(s.getTime())) continue;
        const endWall = st.allDay && e.end ? toDate(e.end, addDaysWall(w, Math.round(len / 86400000))) : new Date(s.getTime() + len);
        add(s, endWall);
      }
    } else {
      add(toDate(st), e.end ? toDate(e.end) : new Date(toDate(st).getTime() + len));
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
