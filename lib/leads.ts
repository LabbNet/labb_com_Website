import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cppEmail } from "@/lib/site";
import { dbConfigured, sql } from "@/lib/db";
import { emailLayout, sendMail } from "@/lib/mail";
import { SEGMENT_PATH, segmentLabel, statusLabel, type Segment } from "@/lib/segments";
import { absoluteUrl } from "@/lib/site";

// Lead handling. Every lead is saved to Postgres first (the permanent record), then the
// notification address set in /admin/settings gets an email. Optional: LEAD_WEBHOOK_URL
// also receives the JSON. A lead is only reported as failed if it was neither saved nor emailed.

export type Lead = {
  type: string; // quote | sample | handbook | clinic | certification-waitlist | contact | early-access | cpp-application
  segment: Segment;
  products?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  city?: string;
  state?: string;
  industry?: string;
  volume?: string;
  interest?: string;
  message?: string;
  resource?: string;
  legalName?: string;
  signer?: string;
  services?: string;
  affiliation?: string;
  clinicType?: string;
  details?: Record<string, string>;
  wantsAgreement?: boolean;
  newsletter?: boolean;
  page?: string;
  referrer?: string;
  utm?: Record<string, string>;
  submittedAt: string;
  ip?: string;
};

export type LeadRow = {
  id: string;
  type: string;
  segment: string;
  products: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  industry: string | null;
  volume: string | null;
  interest: string | null;
  message: string | null;
  resource: string | null;
  page: string | null;
  referrer: string | null;
  utm: Record<string, string> | null;
  data: Record<string, unknown>;
  owner: "labb" | "partner";
  partner_id: string | null;
  partner_name?: string | null;
  partner_clinic?: string | null;
  passed_at: Date | null;
  accepted_at?: Date | null;
  accepted_by?: string | null;
  meeting_host?: string | null;
  book_token?: string | null;
  status: string;
  archived: boolean;
  existing_client?: boolean;
  notified: boolean;
  created_at: Date;
  updated_at: Date;
};

export { esc } from "@/lib/mail";
import { esc } from "@/lib/mail";

export const leadName = (l: Pick<LeadRow, "first_name" | "last_name" | "company" | "email">) =>
  [l.first_name, l.last_name].filter(Boolean).join(" ") || l.company || l.email;

// ---- Settings ----
export const DEFAULT_NOTIFY = "kelly.ramsey@labb.com";

export async function getSetting(key: string): Promise<string | null> {
  if (!dbConfigured) return null;
  try {
    const [row] = await sql()<{ value: string }[]>`select value from site_settings where key = ${key}`;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string, actorId?: string) {
  await sql()`insert into site_settings (key, value, updated_by) values (${key}, ${value}, ${actorId ?? null})
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`;
}

export async function notifyAddresses(): Promise<string[]> {
  const raw = (await getSetting("lead_notify_emails")) || process.env.LEAD_TO_EMAIL || DEFAULT_NOTIFY;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

// ---- History ----
export async function logLeadEvent(leadId: string | number, event: string, detail?: string | null, actor?: { id: string; name: string } | null) {
  await sql()`insert into lead_events (lead_id, actor_id, actor_name, event, detail)
    values (${leadId}, ${actor?.id ?? null}, ${actor?.name ?? "Website"}, ${event}, ${detail ?? null})`;
}

// ---- Rendering ----
// Extra structured answers from specialized forms (for example Quick Test). Only known keys are kept.
export const DETAIL_KEYS = ["topic", "backgroundScreening", "currentProgram", "improve", "costPerTest", "testingLocation", "fulfillment", "shipping", "clinicZip", "clinicName", "testType", "observation", "reason", "panel", "reportTo", "reportEmail", "address1", "address2", "city", "state", "zip", "deliverBy", "drugs", "kit", "screenFee", "shippingFee", "proctoringFee", "total", "recommended", "features", "locations", "source"] as const;
export function detailsOf(v: unknown) {
  if (!v || typeof v !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const k of DETAIL_KEYS) {
    const val = (v as Record<string, unknown>)[k];
    if (typeof val === "string" && val.trim()) out[k] = val.trim().slice(0, k === "currentProgram" || k === "features" ? 2000 : 300);
  }
  return Object.keys(out).length ? out : undefined;
}

export const DETAIL_LABELS: Record<string, string> = {
  source: "Lead source",
  topic: "Opened from",
  stage: "Form",
  backgroundScreening: "Background screening",
  currentProgram: "Current program", improve: "Wants to improve", costPerTest: "Current cost per test", testingLocation: "Where testing happens",
  fulfillment: "Where", shipping: "Shipping", clinicZip: "Clinic near ZIP", clinicName: "Preferred clinic", paid: "Payment", drugs: "Drugs", kit: "Kit to send", screenFee: "Test kit price", shippingFee: "Shipping fee", proctoringFee: "Proctoring or collection fee", total: "Total",
  recommended: "Recommended platform", features: "Features they want", locations: "Locations",
  testType: "Test type", observation: "Collection", reason: "Reason for test", panel: "Drugs to test", reportTo: "Send report to",
  reportEmail: "Report recipient email", address1: "Ship to", address2: "Ship to (line 2)", city: "City", state: "State", zip: "ZIP",
  deliverBy: "Needed by",
};
export function detailRows(d?: Record<string, string> | null): [string, string | undefined][] {
  return d ? Object.entries(d).map(([k, v]) => [DETAIL_LABELS[k] || k, v]) : [];
}
function rows(lead: Lead): [string, string | undefined][] {
  return [
    ["Segment", segmentLabel(lead.segment)],
    ["Lead path", SEGMENT_PATH[lead.segment]],
    ["Form", lead.type],
    ["Name", `${lead.firstName} ${lead.lastName}`.trim()],
    ["Organization", lead.company],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["City / State", [lead.city, lead.state].filter(Boolean).join(", ")],
    ["Interested in", lead.products],
    ["Industry", lead.industry],
    ["Monthly volume", lead.volume],
    ["Interest level", lead.interest],
    ["Resource", lead.resource],
    ["Legal business name", lead.legalName],
    ["Agreement signer", lead.signer],
    ["Services offered", lead.services],
    ["Affiliation", lead.affiliation],
    ["Business type", lead.clinicType],
    ...detailRows(lead.details),
    ["Send CPP agreement", lead.type === "cpp-application" ? (lead.wantsAgreement ? "YES, send the agreement" : "No, wants a call first") : undefined],
    ["Newsletter", lead.newsletter ? "Yes" : "No"],
    ["Message", lead.message],
    ["Page", lead.page],
    ["Referrer", lead.referrer],
    ["UTM", lead.utm && Object.keys(lead.utm).length ? Object.entries(lead.utm).map(([k, v]) => `${k}=${v}`).join(" ") : undefined],
    ["Received", new Date(lead.submittedAt).toLocaleString("en-US", { timeZone: "America/New_York" }) + " ET"],
  ];
}

function table(r: [string, string | undefined][]) {
  return `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px;color:#404951;border-collapse:collapse">${r
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="font-weight:bold;border-bottom:1px solid #dfe5e5;vertical-align:top">${esc(k)}</td><td style="border-bottom:1px solid #dfe5e5">${esc(v)}</td></tr>`)
    .join("")}</table>`;
}

// ---- Save and deliver ----
export async function saveLead(lead: Lead): Promise<string> {
  return (await saveLeadDetailed(lead)).id;
}

export type RepeatOf = { id: string; owner: string; partner: string | null; accepted: boolean; host: string | null };

// Saves the submission. When the same email already has a lead, the new submission is folded into it so one
// person stays one record with one owner (never two reps). Quick Test orders are kept separate.
export async function saveLeadDetailed(lead: Lead): Promise<{ id: string; repeatOf: RepeatOf | null }> {
  const id = await insertLead(lead);
  if (lead.type === "quick-test") return { id, repeatOf: null };
  const flag = (leadId: string) => { import("@/lib/dupes").then((m) => m.scanDupes(leadId)).catch((e) => console.error("[dupes] scan failed", e)); };
  try {
    const db = sql();
    const [prev] = await db<(LeadRow & { partner: string | null; host: string | null })[]>`
      select l.*, coalesce(p.clinic, p.name) as partner, h.name as host from leads l
      left join members p on p.id = l.partner_id left join members h on h.id = l.meeting_host
      where lower(l.email) = ${lead.email.toLowerCase()} and l.id <> ${id} and l.type <> 'quick-test'
      order by l.created_at limit 1`;
    if (!prev) { flag(id); return { id, repeatOf: null }; }
    await mergeLeads(String(prev.id), [id], { id: null as never, name: "Website" });
    if (prev.type === "newsletter" && lead.type !== "newsletter") await db`update leads set type = ${lead.type}, segment = ${lead.segment} where id = ${prev.id}`;
    await logLeadEvent(prev.id, "repeat", `Submitted again (${lead.type.replace(/-/g, " ")}) from ${lead.page || "the website"}; added to this record`);
    flag(String(prev.id));
    return { id: String(prev.id), repeatOf: { id: String(prev.id), owner: prev.owner, partner: prev.owner === "partner" ? prev.partner : null, accepted: !!prev.accepted_at, host: prev.host } };
  } catch (e) {
    console.error("[lead] consolidate failed", e);
    return { id, repeatOf: null };
  }
}

async function insertLead(lead: Lead): Promise<string> {
  const extra = {
    legalName: lead.legalName || undefined,
    signer: lead.signer || undefined,
    services: lead.services || undefined,
    affiliation: lead.affiliation || undefined,
    clinicType: lead.clinicType || undefined,
    details: lead.details,
    wantsAgreement: lead.type === "cpp-application" ? lead.wantsAgreement : undefined,
    newsletter: lead.newsletter,
    ip: lead.ip,
  };
  const db = sql();
  const [row] = await db<{ id: string }[]>`
    insert into leads (type, segment, products, first_name, last_name, email, phone, company, city, state, industry, volume, interest,
      message, resource, page, referrer, utm, data, created_at)
    values (${lead.type}, ${lead.segment}, ${lead.products || null}, ${lead.firstName || null}, ${lead.lastName || null}, ${lead.email},
      ${lead.phone || null}, ${lead.company || null}, ${lead.city || null}, ${lead.state || null}, ${lead.industry || null}, ${lead.volume || null},
      ${lead.interest || null}, ${lead.message || null}, ${lead.resource || null}, ${lead.page || null}, ${lead.referrer || null},
      ${lead.utm && Object.keys(lead.utm).length ? db.json(lead.utm) : null}, ${db.json(JSON.parse(JSON.stringify(extra)))}, ${lead.submittedAt})
    returning id`;
  if (lead.type !== "manual") await logLeadEvent(row.id, "received", `Submitted from ${lead.page || "the website"}`);
  return row.id;
}

// Two-step consultation forms: step 1 saves the contact details and returns a token that lets the same
// browser add its program details (step 2) to that lead once.
export const STAGE_CONTACT = "Step 1 of 2: contact details only";
export const STAGE_COMPLETE = "Both steps completed";
export function leadToken(id: string) {
  return createHmac("sha256", process.env.SESSION_SECRET || "local-dev-secret").update(`lead-step2:${id}`).digest("base64url").slice(0, 32);
}
export function checkLeadToken(id: string, token: string) {
  const a = Buffer.from(leadToken(id));
  const b = Buffer.from(token || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function deliverLead(lead: Lead, existingId?: string) {
  let id: string | undefined = existingId;
  let repeatOf: RepeatOf | null = null;
  if (!id && dbConfigured) {
    try {
      ({ id, repeatOf } = await saveLeadDetailed(lead));
    } catch (e) {
      console.error("[lead] save failed", e);
    }
  }

  const name = lead.company || `${lead.firstName} ${lead.lastName}`.trim() || lead.email;
  const subject = lead.type === "quick-test"
      ? `${lead.details?.paid ? "PAID " : ""}Quick Test order: ${`${lead.firstName} ${lead.lastName}`.trim()} (${lead.details?.testType || "test"}, ${lead.details?.state || ""})`
      : lead.type === "cpp-application"
      ? `CPP application${lead.wantsAgreement ? " (SEND AGREEMENT)" : ""}: ${lead.company} (${[lead.city, lead.state].filter(Boolean).join(", ")})`
      : lead.type === "software-quote"
      ? `Software quote (${lead.details?.recommended || "platform"}): ${name}${lead.city || lead.state ? ` (${[lead.city, lead.state].filter(Boolean).join(", ")})` : ""}`
      : `${repeatOf ? "Repeat submission" : `New ${segmentLabel(lead.segment).toLowerCase()} lead`}: ${name}${lead.details?.stage?.startsWith("Step 1") ? " (contact details; program details may follow)" : ""}`;
  const r = rows(lead);
  const owned = repeatOf ? (repeatOf.partner ? `with CPP member ${repeatOf.partner}` : repeatOf.accepted ? `kept at Labb${repeatOf.host ? `, assigned to ${repeatOf.host}` : ""}` : null) : null;
  if (repeatOf) r.unshift(["Existing lead", `This person already had lead #${repeatOf.id}${owned ? ` (${owned})` : ""}. This submission was added to that record.`]);
  const html = emailLayout(
    esc(subject),
    table(r) + (id ? "" : `<p style="color:#b42318;font-size:13px">This lead could not be saved to the lead database. Keep this email.</p>`),
    id ? { href: absoluteUrl(`/admin/leads/${id}`), label: "Open the lead" } : undefined,
  );
  const text = r.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n") + (id ? `\n\nOpen the lead: ${absoluteUrl(`/admin/leads/${id}`)}` : "");

  const to = lead.type === "cpp-application" ? (process.env.CPP_LEAD_TO_EMAIL ? process.env.CPP_LEAD_TO_EMAIL.split(",") : [cppEmail]) : await notifyAddresses();
  const emailed = await sendMail(to, subject, html, text, { replyTo: lead.email, from: process.env.LEAD_FROM_EMAIL || "Labb Website <info@mail.labb.com>" });

  if (id) {
    try {
      if (emailed) await sql()`update leads set notified = true where id = ${id}`;
      await logLeadEvent(id, emailed ? "notified" : "notify_failed", emailed ? `Emailed ${to.join(", ")}` : "No email provider succeeded");
    } catch (e) {
      console.error("[lead] history write failed", e);
    }
  }

  // Every new lead also asks Labb to decide who owns it: a CPP member or Labb.
  // Newsletter sign-ups and CPP applications aren't sales leads, so they're skipped.
  if (lead.type !== "newsletter" && lead.type !== "cpp-application" && !repeatOf) {
    const assignTo = (process.env.LEAD_ASSIGN_EMAILS || "James@labb.com,Kelly.Ramsey@labb.com").split(",").map((e) => e.trim()).filter(Boolean);
    const who = [`${lead.firstName || ""} ${lead.lastName || ""}`.trim(), lead.company].filter(Boolean).join(", ") || lead.email;
    const where = [lead.city, lead.state].filter(Boolean).join(", ");
    try {
      await sendMail(
        assignTo,
        `Lead completed: assign to CPP or Labb (${who})`,
        emailLayout(
          "Lead completed",
          `<p><strong>Lead completed and assignment to CPP or Labb is required.</strong></p>
           <p>${esc(who)}${where ? ` · ${esc(where)}` : ""}<br>${esc(segmentLabel(lead.segment))} · ${esc(lead.type)}${lead.page ? ` · from ${esc(lead.page)}` : ""}</p>`,
          id ? { href: absoluteUrl(`/admin/leads/${id}`), label: "Assign the lead" } : undefined,
        ),
        `Lead completed and assignment to CPP or Labb is required.\n${who}${where ? ` (${where})` : ""}\n${segmentLabel(lead.segment)} · ${lead.type}${id ? `\nAssign it: ${absoluteUrl(`/admin/leads/${id}`)}` : ""}`,
        { replyTo: lead.email },
      );
    } catch (e) {
      console.error("[lead] assignment email failed", e);
    }
  }

  if (process.env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(process.env.LEAD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...lead }) });
    } catch (e) {
      console.error("[lead] webhook failed", e);
    }
  }

  if (!id && !emailed) {
    console.warn("[lead] Not saved and not emailed. Lead:", JSON.stringify(lead));
    if (process.env.NODE_ENV === "production") throw new Error("Lead could not be saved or emailed");
  }
  return { id, emailed };
}

// Email a channel partner when a lead is passed to them.
export async function emailPartner(partner: { email: string; name: string }, lead: LeadRow) {
  const r: [string, string | undefined][] = [
    ["Segment", segmentLabel(lead.segment)],
    ["Name", leadName(lead)],
    ["Organization", lead.company || undefined],
    ["Email", lead.email],
    ["Phone", lead.phone || undefined],
    ["City / State", [lead.city, lead.state].filter(Boolean).join(", ") || undefined],
    ["Interested in", lead.products || undefined],
    ["Monthly volume", lead.volume || undefined],
    ["Message", lead.message || undefined],
  ];
  const link = absoluteUrl("/members/leads");
  const html = emailLayout(
    `Labb has passed you a new lead`,
    `<p>Hi ${esc(partner.name.split(" ")[0])}, Labb has passed you a lead. Please reach out and keep its status up to date in your CPP member account.</p>${table(r)}`,
    { href: link, label: "Open my leads" },
  );
  const text = `Labb has passed you a lead.\n\n${r.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nUpdate its status: ${link}`;
  return sendMail(partner.email, `New lead from Labb: ${leadName(lead)}`, html, text, { replyTo: cppEmail });
}

export { statusLabel };

// Rebuild a Lead from a stored row (used after Stripe confirms payment, to send the notification).
export function leadFromRow(r: LeadRow): Lead {
  const d = (r.data || {}) as Record<string, unknown>;
  return {
    type: r.type, segment: r.segment as Lead["segment"], products: r.products || undefined, firstName: r.first_name || "", lastName: r.last_name || "",
    email: r.email, phone: r.phone || undefined, company: r.company || undefined, city: r.city || undefined, state: r.state || undefined,
    message: r.message || undefined, page: r.page || undefined, referrer: r.referrer || undefined,
    details: (d.details as Record<string, string>) || undefined, submittedAt: new Date(r.created_at).toISOString(),
  };
}

// ---- Duplicates and merging ----
// Other leads from the same person: same email (any case), or same phone digits when both have a phone.
export async function duplicateLeads(lead: LeadRow) {
  const digits = (lead.phone || "").replace(/\D/g, "").slice(-10);
  return sql()<(LeadRow & { events: number })[]>`
    select l.*, (select count(*)::int from lead_events e where e.lead_id = l.id) as events
    from leads l
    where l.id <> ${lead.id}
      and (lower(l.email) = ${lead.email.toLowerCase()}
        or (${digits.length === 10} and right(regexp_replace(coalesce(l.phone, ''), '\\D', '', 'g'), 10) = ${digits}))
    order by l.created_at`;
}

const STATUS_RANK: Record<string, number> = { new: 0, contacted: 1, qualified: 2, "quote-requested": 2.3, "quote-sent": 2.6, won: 3, lost: -1, "not-qualified": -1, "existing-client": 4 };

// Fold duplicate leads into one record. History, meetings, quotes, guidebook emails and website visits move
// to the primary; empty fields on the primary are filled from the duplicates; the duplicates are deleted.
export async function mergeLeads(primaryId: string, dupIds: string[], actor: { id: string; name: string }) {
  const db = sql();
  return db.begin(async (tx) => {
    const [primary] = await tx<LeadRow[]>`select * from leads where id = ${primaryId} for update`;
    if (!primary) throw new Error("Lead not found.");
    const dups = await tx<LeadRow[]>`select * from leads where id = any(${dupIds}) and id <> ${primaryId} order by created_at for update`;
    if (!dups.length) throw new Error("Choose at least one lead to merge.");
    const otherPartner = dups.find((d) => d.owner === "partner" && d.partner_id && d.partner_id !== primary.partner_id);
    if (otherPartner) throw new Error(`Lead #${otherPartner.id} is with a CPP member. Pass it back to Labb before merging.`);

    const all = [primary, ...dups];
    const pick = <K extends keyof LeadRow>(k: K) => (primary[k] ?? dups.map((d) => d[k]).find((v) => v !== null && v !== "")) ?? null;
    const products = [...new Set(all.flatMap((l) => String(l.products || "").split(",").map((p) => p.trim()).filter(Boolean)))].join(", ") || null;
    const messages = all.filter((l) => l.message?.trim()).map((l) => (l === primary ? l.message!.trim() : `[${new Date(l.created_at).toLocaleDateString("en-US", { timeZone: "America/New_York" })}, ${l.type}] ${l.message!.trim()}`));
    const status = all.filter((l) => l.status !== "lost" && l.status !== "not-qualified").sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status])[0]?.status ?? primary.status;
    const created = new Date(Math.min(...all.map((l) => new Date(l.created_at).getTime())));
    const data = { ...Object.assign({}, ...dups.map((d) => d.data || {}).reverse()), ...(primary.data || {}) } as Record<string, unknown>;
    data.details = { ...Object.assign({}, ...dups.map((d) => (d.data as Record<string, unknown>)?.details || {}).reverse()), ...((primary.data as Record<string, unknown>)?.details as object || {}) };
    data.merged_from = [...((primary.data as { merged_from?: unknown[] })?.merged_from || []), ...dups.map((d) => ({ id: d.id, type: d.type, created_at: d.created_at, email: d.email }))];

    await tx`update leads set
      first_name = ${pick("first_name")}, last_name = ${pick("last_name")}, phone = ${pick("phone")}, company = ${pick("company")},
      city = ${pick("city")}, state = ${pick("state")}, industry = ${pick("industry")}, volume = ${pick("volume")}, interest = ${pick("interest")},
      products = ${products}, message = ${messages.join("\n\n") || null}, utm = ${pick("utm") as never},
      accepted_at = ${pick("accepted_at" as keyof LeadRow) as never}, meeting_host = ${pick("meeting_host" as keyof LeadRow) as never},
      status = ${status}, archived = false, data = ${tx.json(data as never)}, created_at = ${created}, updated_at = now()
      where id = ${primaryId}`;
    for (const t of ["lead_events", "lead_meetings", "member_quotes", "sequence_runs", "visitor_links", "ask_questions"]) {
      await tx`update ${tx(t)} set lead_id = ${primaryId} where lead_id = any(${dupIds})`;
    }
    // A duplicate's booking link keeps working by moving it to the primary when the primary has none.
    const token = dups.find((d) => d.book_token)?.book_token;
    if (!primary.book_token && token) {
      await tx`update leads set book_token = null where id = any(${dupIds})`;
      await tx`update leads set book_token = ${token} where id = ${primaryId}`;
    }
    await tx`delete from lead_dupe_flags where (lead_a = any(${dupIds}) and lead_b = ${primaryId}) or (lead_b = any(${dupIds}) and lead_a = ${primaryId})`;
    await tx`update leads set existing_client = true, status = 'existing-client' where id = ${primaryId} and ${all.some((l) => l.existing_client)}`;
    await tx`delete from leads where id = any(${dupIds}) and id <> ${primaryId}`;
    await tx`insert into lead_events (lead_id, actor_id, actor_name, event, detail) values (${primaryId}, ${actor.id}, ${actor.name}, 'merged',
      ${`Merged ${dups.length === 1 ? "a duplicate submission" : `${dups.length} duplicate submissions`} into this record: ${dups.map((d) => `#${d.id} (${d.type}, ${new Date(d.created_at).toLocaleDateString("en-US", { timeZone: "America/New_York" })})`).join(", ")}`})`;
    return dups.length;
  });
}
