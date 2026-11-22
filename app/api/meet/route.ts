import { sameOrigin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { logLeadEvent, type LeadRow } from "@/lib/leads";
import { emailBooked, emailCancelled, emailHostBooked, fmtWhen, openSlots, roomFor, SLOT_MIN } from "@/lib/meetings";

// A prospect books, reschedules or cancels a Labb call from their private /meet/<token> page.
export async function POST(req: Request) {
  const fd = await req.formData();
  const token = field(fd, "token", 60);
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return go(req, "/");
  const page = `/meet/${token}`;
  if (!(await sameOrigin())) return go(req, page);
  const db = sql();
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

  const startIso = field(fd, "start", 40);
  const start = new Date(startIso);
  if (!startIso || Number.isNaN(start.getTime())) return go(req, `${page}?m=pick`);
  const slot = (await openSlots(lead.meeting_host || null)).find((s) => s.start.getTime() === start.getTime());
  if (!slot) return go(req, `${page}?m=taken`);
  const [host] = await db<{ id: string; name: string; email: string; meeting_url: string | null }[]>`select id, name, email, meeting_url from members where id = ${slot.hostId}`;
  const notes = field(fd, "notes", 1000) || null;
  const phone = field(fd, "phone", 40);
  const end = new Date(start.getTime() + SLOT_MIN * 60000);
  const old = await current();
  let mt: { id: string; starts_at: Date; ends_at: Date; room_url: string } | undefined;
  try {
    [mt] = await db<{ id: string; starts_at: Date; ends_at: Date; room_url: string }[]>`
      insert into lead_meetings (lead_id, host_id, starts_at, ends_at, room_url, notes)
      values (${lead.id}, ${host.id}, ${start}, ${end}, ${roomFor(host)}, ${notes}) returning id, starts_at, ends_at, room_url`;
  } catch {
    return go(req, `${page}?m=taken`);
  }
  if (old) {
    await db`update lead_meetings set status = 'cancelled' where id = ${old.id}`;
    await emailCancelled(lead, old, { name: old.host_name, email: old.host_email }, true, null);
  }
  if (phone && phone !== lead.phone) await db`update leads set phone = ${phone}, updated_at = now() where id = ${lead.id}`;
  await db`update leads set status = case when status in ('new', 'contacted') then 'qualified' else status end, updated_at = now() where id = ${lead.id}`;
  const fresh = { ...lead, phone: phone || lead.phone };
  const sent = await emailBooked(fresh, mt, host, token);
  await emailHostBooked(fresh, mt, host, notes);
  await log(`${old ? "Rescheduled to" : "Booked"} ${fmtWhen(mt.starts_at)} with ${host.name}${sent ? "; confirmation and video link emailed" : "; confirmation email did not send"}${notes ? `. Note: ${notes}` : ""}`);
  return go(req, `${page}?m=booked`);
}
