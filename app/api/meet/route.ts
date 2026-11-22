import { sameOrigin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { logLeadEvent, type LeadRow } from "@/lib/leads";
import { bookMeeting, emailBooked, emailCancelled, fmtWhen, openSlots, readTestToken, roomFor, SLOT_MIN, testLead } from "@/lib/meetings";

// A prospect books, reschedules or cancels a Labb call from their private /meet/<token> page.
export async function POST(req: Request) {
  const fd = await req.formData();
  const token = field(fd, "token", 300);
  const test = readTestToken(token);
  if (!test && !/^[A-Za-z0-9_-]{20,40}$/.test(token)) return go(req, "/");
  const page = `/meet/${token}`;
  if (!(await sameOrigin())) return go(req, page);
  const db = sql();
  if (test) {
    // Test booking: email the admin the real confirmation with a real video room. Nothing is saved.
    if (field(fd, "action", 10) !== "book") return go(req, page);
    const start = new Date(field(fd, "start", 40));
    const slot = (await openSlots(test.host)).find((x) => x.start.getTime() === start.getTime());
    if (!slot) return go(req, `${page}?m=taken`);
    const me = await testLead(test.adminId);
    const [host] = await db<{ name: string; email: string; meeting_url: string | null }[]>`select name, email, meeting_url from members where id = ${slot.hostId}`;
    if (me && host) await emailBooked(me, { id: `test-${Date.now()}`, starts_at: slot.start, ends_at: new Date(slot.start.getTime() + SLOT_MIN * 60000), room_url: roomFor(host) }, host, token, true);
    return go(req, `${page}?m=testbooked`);
  }
  const [lead] = await db<LeadRow[]>`select * from leads where book_token = ${token} and not archived and owner = 'labb'`;
  if (!lead) return go(req, page);
  const action = field(fd, "action", 10);
  const log = (d: string) => logLeadEvent(lead.id, "meeting", d, null);

  const current = async () => (await db<{ id: string; starts_at: Date; ends_at: Date; room_url: string; host_id: string; host_name: string; host_email: string }[]>`
    select g.id, g.starts_at, g.ends_at, g.room_url, g.host_id, m.name as host_name, m.email as host_email
    from lead_meetings g join members m on m.id = g.host_id
    where g.lead_id = ${lead.id} and g.status = 'booked' and g.ends_at > now() order by g.starts_at limit 1`)[0];

  if (action === "cancel") {
    const c = await current();
    if (c) {
      await db`update lead_meetings set status = 'cancelled' where id = ${c.id}`;
      await emailCancelled(lead, c, { name: c.host_name, email: c.host_email }, true, null);
      await log(`Prospect cancelled the call set for ${fmtWhen(c.starts_at)}`);
    }
    return go(req, `${page}?m=cancelled`);
  }

  const r = await bookMeeting(lead, token, field(fd, "start", 40), field(fd, "notes", 1000) || null, field(fd, "phone", 40));
  return go(req, `${page}?m=${r}`);
}
