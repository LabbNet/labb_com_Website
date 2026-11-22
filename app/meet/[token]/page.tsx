import type { Metadata } from "next";
import { sql } from "@/lib/db";
import type { LeadRow } from "@/lib/leads";
import { DAYS, etDate, fmtClock, fmtDayLabel, fmtWhen, openSlots, readTestToken, SLOT_MIN, testLead } from "@/lib/meetings";

export const metadata: Metadata = { title: "Schedule a call with Labb", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const MSG: Record<string, string> = {
  booked: "You're booked. We emailed your confirmation and video meeting link.",
  cancelled: "Your call is cancelled. Pick a new time below whenever you're ready.",
  taken: "Sorry, that time was just taken. Please choose another.",
  pick: "Choose a time first.",
  testbooked: "Test booked. The confirmation with the video meeting link went to your email. Nothing was saved.",
};

// Private booking page from the "Schedule a call with Labb" email. The token in the URL is the only key.
export default async function Meet({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ m?: string }> }) {
  const { token } = await params;
  const { m } = await searchParams;
  const db = sql();
  const test = readTestToken(token);
  let lead: (LeadRow & { host_name: string | null }) | undefined;
  if (test) {
    const t = await testLead(test.adminId);
    const [h] = test.host ? await db<{ name: string }[]>`select name from members where id = ${test.host}` : [];
    if (t) lead = { ...t, meeting_host: test.host, host_name: h?.name ?? null };
  } else if (/^[A-Za-z0-9_-]{20,40}$/.test(token)) {
    [lead] = await db<(LeadRow & { host_name: string | null })[]>`
      select l.*, h.name as host_name from leads l left join members h on h.id = l.meeting_host
      where l.book_token = ${token} and not l.archived and l.owner = 'labb'`;
  }
  if (!lead) {
    return (
      <section className="section"><div className="wrap" style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: "1.8rem" }}>This link is no longer active</h1>
        <p>Please email <a href="mailto:info@labb.com">info@labb.com</a> and we&apos;ll set up a time with you.</p>
      </div></section>
    );
  }
  const [booked] = test ? [] : await db<{ id: string; starts_at: Date; room_url: string; host_name: string }[]>`
    select g.id, g.starts_at, g.room_url, m.name as host_name from lead_meetings g join members m on m.id = g.host_id
    where g.lead_id = ${lead.id} and g.status = 'booked' and g.ends_at > now() order by g.starts_at limit 1`;
  const slots = await openSlots(lead.meeting_host || null);
  const days = new Map<string, Date[]>();
  for (const s of slots) {
    const d = etDate(s.start);
    if (!days.has(d)) days.set(d, []);
    days.get(d)!.push(s.start);
  }
  const who = lead.host_name ? `${lead.host_name} from Labb` : "a member of the Labb team";

  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap" style={{ maxWidth: 820 }}>
        {test && <p className="form-ok" role="status">Test page. This is exactly what a prospect sees. Booking a time here emails the confirmation and video meeting link to you only. Nothing is saved and no one else is emailed.</p>}
        <span className="eyebrow">Labb</span>
        <h1 style={{ fontSize: "2rem", margin: "6px 0 10px" }}>{booked ? "Your call is booked" : "Schedule your call with Labb"}</h1>
        {m && MSG[m] && <p className={m === "taken" || m === "pick" ? "form-error" : "form-ok"} role="status">{MSG[m]}</p>}

        {booked ? (
          <div className="hero-card" style={{ marginTop: 16 }}>
            <p style={{ margin: 0, fontSize: "1.15rem" }}><strong>{fmtWhen(booked.starts_at)}</strong></p>
            <p style={{ margin: "6px 0 16px" }}>{SLOT_MIN} minute video call with {booked.host_name}.</p>
            <a className="btn btn-primary" href={booked.room_url} target="_blank" rel="noreferrer">Join the video meeting</a>
            <p className="fine" style={{ textAlign: "left", marginTop: 12 }}>Your meeting link: <a href={booked.room_url} target="_blank" rel="noreferrer">{booked.room_url}</a>. It&apos;s also in your confirmation email.</p>
            <form action="/api/meet" method="post" style={{ marginTop: 8 }}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="action" value="cancel" />
              <button className="linkish" type="submit">Cancel this call</button>
              <span className="fine"> or pick a new time below to reschedule.</span>
            </form>
          </div>
        ) : (
          <p style={{ marginTop: 0 }}>Hi {lead.first_name || "there"}. Pick a time for a {SLOT_MIN} minute video call with {who} to go over all of Labb&apos;s programs and find the right fit for {lead.company || "your organization"}. All times are Eastern (ET).</p>
        )}

        {!slots.length ? (
          <div className="hero-card" style={{ marginTop: 20 }}>
            <p style={{ margin: 0 }}>There are no open times right now. Email <a href="mailto:info@labb.com">info@labb.com</a> or reply to our email and we&apos;ll find a time with you.</p>
          </div>
        ) : (
          <form action="/api/meet" method="post" style={{ marginTop: 24 }}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="action" value="book" />
            {booked && <h2 style={{ fontSize: "1.2rem", margin: "0 0 4px" }}>Reschedule</h2>}
            <div className="meet-days">
              {[...days.entries()].map(([d, times]) => (
                <fieldset key={d} className="meet-day" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend><h3>{fmtDayLabel(d)}</h3></legend>
                  <div className="meet-slots">
                    {times.map((t) => (
                      <label key={t.toISOString()}>
                        <input type="radio" name="start" value={t.toISOString()} required aria-label={`${DAYS[new Date(`${d}T12:00:00Z`).getUTCDay()]} ${fmtClock(t)} ET`} />
                        <span>{fmtClock(t)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="fields" style={{ marginTop: 24 }}>
              <div className="field"><label htmlFor="mt-ph">Best phone number (optional)</label><input id="mt-ph" name="phone" type="tel" maxLength={40} defaultValue={lead.phone || ""} autoComplete="tel" /></div>
              <div className="field full"><label htmlFor="mt-nt">Anything we should know before the call? (optional)</label><textarea id="mt-nt" name="notes" maxLength={1000} /></div>
            </div>
            <button className="btn btn-primary" type="submit" style={{ marginTop: 18 }}>{booked ? "Reschedule my call" : "Book my call"}</button>
            <p className="fine" style={{ textAlign: "left", marginTop: 10 }}>You&apos;ll get a confirmation email with your video meeting link and a calendar invite.</p>
          </form>
        )}
      </div>
    </section>
  );
}
