import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { emailPartner, esc, logLeadEvent, type LeadRow } from "@/lib/leads";
import { emailLayout, sendMail } from "@/lib/mail";
import { absoluteUrl, cppEmail } from "@/lib/site";
import { MEMBER_LEAD_SEGMENTS, segmentLabel } from "@/lib/segments";
import { isStatus, statusLabel } from "@/lib/segments";
import { CPP_SEQUENCES, sequenceName, startSequence, stopSequence } from "@/lib/sequences";

// A CPP member updates a lead Labb passed to them. Logged in the lead's history with their name.
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m) return go(req, "/login?next=/members/leads");
  if (!(await sameOrigin())) return go(req, "/members/leads");
  const fd = await req.formData();
  const id = field(fd, "id", 20);
  if (field(fd, "action", 20) === "pass") return passLead(req, m, id, field(fd, "partner", 40));
  if (field(fd, "action", 20) === "add") return addLead(req, m, fd);
  if (field(fd, "action", 20) === "sequence") return memberSequence(req, m, id, field(fd, "sequence", 80));
  if (field(fd, "action", 20) === "sequence-stop") return memberStop(req, m, id, field(fd, "run", 20));
  const status = field(fd, "status", 20);
  const note = field(fd, "note", 2000);
  if (!/^\d+$/.test(id)) return go(req, "/members/leads");
  const db = sql();
  const [lead] = await db<{ status: string; company: string | null; email: string }[]>`
    select status, company, email from leads where id = ${id} and partner_id = ${m.id} and owner = 'partner'`;
  if (!lead) return go(req, "/members/leads");
  const actor = { id: m.id, name: m.clinic ? `${m.name} (${m.clinic})` : m.name };

  let changed = false;
  if (isStatus(status) && status !== lead.status) {
    await db`update leads set status = ${status}, updated_at = now() where id = ${id}`;
    await logLeadEvent(id, "status", `${statusLabel(lead.status)} to ${statusLabel(status)}`, actor);
    changed = true;
  }
  if (note) {
    await logLeadEvent(id, "note", note, actor);
    await db`update leads set updated_at = now() where id = ${id}`;
    changed = true;
  }
  if (changed) await setFlash(`Saved your update for ${lead.company || lead.email}.`, "ok", undefined, "/members");
  return go(req, "/members/leads");
}

// A CPP member hands a lead to another active CPP member. Labb sees the hand-off in the lead history.
async function passLead(req: Request, m: { id: string; name: string; clinic: string | null }, id: string, partnerId: string) {
  if (!/^\d+$/.test(id)) return go(req, "/members/leads");
  const db = sql();
  const [lead] = await db<LeadRow[]>`select * from leads where id = ${id} and partner_id = ${m.id} and owner = 'partner'`;
  if (!lead) return go(req, "/members/leads");
  const [to] = await db<{ id: string; name: string; email: string; clinic: string | null }[]>`
    select id, name, email, clinic from members where id = ${partnerId} and id <> ${m.id} and role = 'member' and status = 'active' and cpp_status = 'active'`;
  if (!to) {
    await setFlash("Choose an active CPP member to pass the lead to.", "error", undefined, "/members");
    return go(req, "/members/leads");
  }
  await db`update leads set partner_id = ${to.id}, passed_at = now(), passed_by = ${m.id}, updated_at = now() where id = ${id}`;
  const from = m.clinic ? `${m.name} (${m.clinic})` : m.name;
  const label = to.clinic ? `${to.clinic} (${to.name})` : to.name;
  await logLeadEvent(id, "passed", `${label}, passed by CPP member ${from}`, { id: m.id, name: from });
  const sent = await emailPartner(to, lead);
  await logLeadEvent(id, "partner_emailed", sent ? `Emailed ${to.email}` : `Email not sent to ${to.email}`, { id: m.id, name: from });
  await setFlash(`Passed ${lead.company || lead.email} to ${label}.`, "ok", undefined, "/members");
  return go(req, "/members/leads");
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

// A CPP member adds a lead they found themselves. It's assigned to them, and Labb is told.
async function addLead(req: Request, m: Mem, fd: FormData) {
  const back = "/members/leads";
  const flash = (msg: string, kind: "ok" | "error" = "ok") => setFlash(msg, kind, undefined, "/members");
  const v = {
    first: field(fd, "first_name", 80), last: field(fd, "last_name", 80), email: field(fd, "email", 200).toLowerCase(),
    phone: field(fd, "phone", 40), company: field(fd, "company", 160), city: field(fd, "city", 80), state: field(fd, "state", 40),
    segment: field(fd, "segment", 40), products: field(fd, "products", 300), volume: field(fd, "volume", 60), message: field(fd, "message", 2000),
  };
  if (!v.company || !v.first || !EMAIL.test(v.email)) {
    await flash("Enter the organization, a contact first name and a valid email address.", "error");
    return go(req, `${back}#add`);
  }
  const segment = (MEMBER_LEAD_SEGMENTS as readonly string[]).includes(v.segment) ? v.segment : "employer";
  const db = sql();
  const [dupe] = await db<{ id: string }[]>`select id from leads where lower(email) = ${v.email} and not archived order by created_at desc limit 1`;
  const actor = { id: m.id, name: m.clinic ? `${m.name} (${m.clinic})` : m.name };
  const [row] = await db<{ id: string }[]>`
    insert into leads (type, segment, products, first_name, last_name, email, phone, company, city, state, volume, message, page, data,
      owner, partner_id, passed_at, passed_by)
    values ('partner-added', ${segment}, ${v.products || null}, ${v.first}, ${v.last || null}, ${v.email}, ${v.phone || null}, ${v.company},
      ${v.city || null}, ${v.state || null}, ${v.volume || null}, ${v.message || null}, '/members/leads',
      ${db.json({ addedBy: actor.name, ...(dupe ? { possibleDuplicateOf: dupe.id } : {}) })}, 'partner', ${m.id}, now(), ${m.id})
    returning id`;
  await logLeadEvent(row.id, "received", `Added by CPP member ${actor.name}`, actor);
  if (dupe) await logLeadEvent(row.id, "note", `Possible duplicate of lead #${dupe.id} (same email).`, null);

  const to = process.env.CPP_LEAD_TO_EMAIL ? process.env.CPP_LEAD_TO_EMAIL.split(",") : [cppEmail];
  const who = [`${v.first} ${v.last}`.trim(), v.company].filter(Boolean).join(", ");
  await sendMail(
    to,
    `CPP member added a lead: ${v.company} (${actor.name})`,
    emailLayout(
      "CPP member added a lead",
      `<p><strong>${esc(actor.name)}</strong> added a lead and is working it.</p>
       <p>${esc(who)}${v.city || v.state ? ` · ${esc([v.city, v.state].filter(Boolean).join(", "))}` : ""}<br>${esc(segmentLabel(segment))}</p>
       ${dupe ? `<p style="color:#b42318">Possible duplicate of lead #${esc(dupe.id)} (same email).</p>` : ""}`,
      { href: absoluteUrl(`/admin/leads/${row.id}`), label: "Open the lead" },
    ),
    `${actor.name} added a lead: ${who} (${segmentLabel(segment)}).${dupe ? ` Possible duplicate of lead #${dupe.id}.` : ""} ${absoluteUrl(`/admin/leads/${row.id}`)}`,
  );
  const seq = field(fd, "sequence", 80);
  if (seq) {
    const r = await startSequence(seq, { id: row.id, email: v.email, first_name: v.first, last_name: v.last || null, company: v.company }, m, true);
    if (r.ok) await logLeadEvent(row.id, "sequence", `${r.name} sequence started by CPP member ${actor.name}`, actor);
    await flash(r.ok ? `Added ${v.company} to your leads and started the ${r.name} emails.` : `Added ${v.company} to your leads. ${r.error}`, r.ok ? "ok" : "error");
    return go(req, back);
  }
  await flash(`Added ${v.company} to your leads.`);
  return go(req, back);
}

type Mem = { id: string; name: string; email: string; clinic: string | null; role: string };

// A CPP member starts an employer guidebook sequence for one of their leads. Replies come to the member.
async function memberSequence(req: Request, m: Mem, id: string, seq: string) {
  const flash = (msg: string, kind: "ok" | "error" = "ok") => setFlash(msg, kind, undefined, "/members");
  if (!/^\d+$/.test(id)) return go(req, "/members/leads");
  if (!CPP_SEQUENCES.some((q) => q.id === seq)) {
    await flash("Choose an employer guidebook.", "error");
    return go(req, "/members/leads");
  }
  const [lead] = await sql()<LeadRow[]>`select * from leads where id = ${id} and partner_id = ${m.id} and owner = 'partner'`;
  if (!lead) return go(req, "/members/leads");
  const r = await startSequence(seq, lead, m, true);
  if (!r.ok) await flash(r.error, "error");
  else {
    const who = m.clinic ? `${m.name} (${m.clinic})` : m.name;
    await logLeadEvent(id, "sequence", `${r.name} sequence started by CPP member ${who}`, { id: m.id, name: who });
    await flash(`${r.name} emails started for ${lead.email}. Replies come to you.`);
  }
  return go(req, `/members/leads#lead-${id}`);
}

async function memberStop(req: Request, m: Mem, id: string, run: string) {
  if (!/^\d+$/.test(id) || !/^\d+$/.test(run)) return go(req, "/members/leads");
  const [r] = await sql()<{ sequence: string }[]>`
    select r.sequence from sequence_runs r join leads l on l.id = r.lead_id
    where r.id = ${run} and r.lead_id = ${id} and r.status = 'active' and l.partner_id = ${m.id} and l.owner = 'partner'`;
  if (r) {
    await stopSequence(run);
    const who = m.clinic ? `${m.name} (${m.clinic})` : m.name;
    await logLeadEvent(id, "sequence", `${sequenceName(r.sequence)} sequence stopped by CPP member ${who}`, { id: m.id, name: who });
    await setFlash(`${sequenceName(r.sequence)} emails stopped.`, "ok", undefined, "/members");
  }
  return go(req, `/members/leads#lead-${id}`);
}
