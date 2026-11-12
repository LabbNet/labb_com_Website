import "server-only";
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
  status: string;
  archived: boolean;
  notified: boolean;
  created_at: Date;
  updated_at: Date;
};

export const esc = (s: unknown = "") => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

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
export const DETAIL_LABELS: Record<string, string> = {
  topic: "Opened from",
  currentProgram: "Current program", improve: "Wants to improve", costPerTest: "Current cost per test", testingLocation: "Where testing happens",
  fulfillment: "Where", clinicZip: "Clinic near ZIP", clinicName: "Preferred clinic", paid: "Payment", drugs: "Drugs", kit: "Kit to send", screenFee: "Screen fee", shippingFee: "Overnight shipping", proctoringFee: "Proctoring", total: "Total",
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
  await logLeadEvent(row.id, "received", `Submitted from ${lead.page || "the website"}`);
  return row.id;
}

export async function deliverLead(lead: Lead, existingId?: string) {
  let id: string | undefined = existingId;
  if (!id && dbConfigured) {
    try {
      id = await saveLead(lead);
    } catch (e) {
      console.error("[lead] save failed", e);
    }
  }

  const name = lead.company || `${lead.firstName} ${lead.lastName}`.trim() || lead.email;
  const subject = lead.type === "quick-test"
      ? `${lead.details?.paid ? "PAID " : ""}Quick Test order: ${`${lead.firstName} ${lead.lastName}`.trim()} (${lead.details?.testType || "test"}, ${lead.details?.state || ""})`
      : lead.type === "cpp-application"
      ? `CPP application${lead.wantsAgreement ? " (SEND AGREEMENT)" : ""}: ${lead.company} (${[lead.city, lead.state].filter(Boolean).join(", ")})`
      : `New ${segmentLabel(lead.segment).toLowerCase()} lead: ${name}`;
  const r = rows(lead);
  const html = emailLayout(
    esc(subject),
    table(r) + (id ? "" : `<p style="color:#b42318;font-size:13px">This lead could not be saved to the lead database. Keep this email.</p>`),
    id ? { href: absoluteUrl(`/admin/leads/${id}`), label: "Open the lead" } : undefined,
  );
  const text = r.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n") + (id ? `\n\nOpen the lead: ${absoluteUrl(`/admin/leads/${id}`)}` : "");

  const to = lead.type === "cpp-application" && process.env.CPP_LEAD_TO_EMAIL ? process.env.CPP_LEAD_TO_EMAIL.split(",") : await notifyAddresses();
  const emailed = await sendMail(to, subject, html, text, { replyTo: lead.email, from: process.env.LEAD_FROM_EMAIL || "Labb Website <leads@labb.com>" });

  if (id) {
    try {
      if (emailed) await sql()`update leads set notified = true where id = ${id}`;
      await logLeadEvent(id, emailed ? "notified" : "notify_failed", emailed ? `Emailed ${to.join(", ")}` : "No email provider succeeded");
    } catch (e) {
      console.error("[lead] history write failed", e);
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
  return sendMail(partner.email, `New lead from Labb: ${leadName(lead)}`, html, text, { replyTo: "info@labb.com" });
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
