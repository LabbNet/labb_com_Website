import "server-only";
import { sql } from "@/lib/db";
import { busyFromIcs } from "@/lib/ics";

// Reads each team member's published Outlook calendar (free/busy link) and stores their busy times,
// so the booking page never offers a time they're already booked in Outlook.
const DAYS_AHEAD = 60;

export async function syncHostCalendar(hostId: string): Promise<{ ok: boolean; count: number; error?: string }> {
  const db = sql();
  const [h] = await db<{ busy_ics_url: string | null }[]>`select busy_ics_url from members where id = ${hostId}`;
  if (!h?.busy_ics_url) {
    await db`delete from host_busy where host_id = ${hostId}`;
    return { ok: true, count: 0 };
  }
  try {
    const url = h.busy_ics_url.replace(/^webcals?:\/\//i, "https://");
    const res = await fetch(url, { headers: { Accept: "text/calendar" }, signal: AbortSignal.timeout(20000), cache: "no-store" });
    if (!res.ok) throw new Error(`The calendar link returned an error (${res.status}).`);
    const text = await res.text();
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("That link isn't a calendar (.ics) link.");
    const from = new Date(Date.now() - 86400000);
    const to = new Date(Date.now() + DAYS_AHEAD * 86400000);
    const busy = busyFromIcs(text, from, to);
    await db.begin(async (tx) => {
      await tx`delete from host_busy where host_id = ${hostId}`;
      for (let i = 0; i < busy.length; i += 500) {
        const chunk = busy.slice(i, i + 500).map((b) => ({ host_id: hostId, starts_at: b.start, ends_at: b.end }));
        await tx`insert into host_busy ${tx(chunk, "host_id", "starts_at", "ends_at")}`;
      }
      await tx`update members set busy_synced_at = now(), busy_error = null where id = ${hostId}`;
    });
    return { ok: true, count: busy.length };
  } catch (e) {
    const error = e instanceof Error ? (e.name === "TimeoutError" ? "The calendar link didn't respond." : e.message) : "The calendar couldn't be read.";
    await db`update members set busy_error = ${error.slice(0, 300)} where id = ${hostId}`;
    return { ok: false, count: 0, error };
  }
}

export async function runCalendarSync() {
  try {
    const hosts = await sql()<{ id: string }[]>`select id from members where role = 'admin' and status <> 'disabled' and busy_ics_url is not null`;
    for (const h of hosts) await syncHostCalendar(h.id);
  } catch (e) {
    console.error("[calsync] failed", e);
  }
}

// Outlook appointments that overlap a time (with the 15 minute buffer), for the admin's warning.
export async function outlookConflicts(hostId: string, start: Date, end: Date) {
  return sql()<{ starts_at: Date; ends_at: Date }[]>`select starts_at, ends_at from host_busy where host_id = ${hostId}
    and starts_at < ${new Date(end.getTime() + 15 * 60000)} and ends_at > ${new Date(start.getTime() - 15 * 60000)} order by starts_at`.catch(() => []);
}
