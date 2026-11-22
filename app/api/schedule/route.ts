import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { logLeadEvent, type LeadRow } from "@/lib/leads";
import { bookMeeting, hostBySlug, newToken } from "@/lib/meetings";
import { linkVisitor } from "@/lib/visitors";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

// Booking from the general /schedule link. Uses the person's open Labb lead if they have one,
// otherwise creates a lead, then books the call exactly like the private booking link does.
export async function POST(req: Request) {
  const fd = await req.formData();
  const slug = field(fd, "with", 30).toLowerCase();
  const back = /^[a-z]{1,30}$/.test(slug) ? `/schedule/${slug}` : "/schedule";
  if (!(await sameOrigin())) return go(req, back);
  if (field(fd, "website", 200)) return go(req, back); // bot trap
  const v = {
    first: field(fd, "first_name", 80), last: field(fd, "last_name", 80), email: field(fd, "email", 200).toLowerCase(),
    company: field(fd, "company", 160), phone: field(fd, "phone", 40), notes: field(fd, "notes", 1000),
  };
  if (!v.first || !v.company || !EMAIL.test(v.email)) return go(req, `${back}?m=invalid`);
  const host = slug ? await hostBySlug(slug) : null;
  const hostId = host && host.hours ? host.id : null;
  const db = sql();
  let [lead] = await db<LeadRow[]>`select * from leads where lower(email) = ${v.email} and owner = 'labb' and not archived order by created_at desc limit 1`;
  const token = lead?.book_token || newToken();
  if (lead) {
    [lead] = await db<LeadRow[]>`update leads set book_token = ${token}, accepted_at = coalesce(accepted_at, now()),
      meeting_host = ${hostId ?? lead.meeting_host ?? null}, company = coalesce(company, ${v.company}), updated_at = now() where id = ${lead.id} returning *`;
  } else {
    [lead] = await db<LeadRow[]>`
      insert into leads (type, segment, first_name, last_name, email, phone, company, message, page, data, owner, accepted_at, book_token, meeting_host)
      values ('meeting-request', 'other', ${v.first}, ${v.last || null}, ${v.email}, ${v.phone || null}, ${v.company}, ${v.notes || null}, ${back},
        ${db.json({})}, 'labb', now(), ${token}, ${hostId}) returning *`;
    await logLeadEvent(lead.id, "received", `Booked a call from the scheduling link${host ? ` for ${host.name}` : ""}`, null);
  }
  const r = await bookMeeting(lead, token, field(fd, "start", 40), v.notes || null, v.phone);
  if (r !== "booked") return go(req, `${back}?m=${r}`);
  await linkVisitor((await cookies()).get("labb_v")?.value, v.email, lead.id, "form").catch(() => {});
  return go(req, `/meet/${token}?m=booked`);
}
