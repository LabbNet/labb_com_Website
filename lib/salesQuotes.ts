import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { emailLayout, esc, sendMail } from "@/lib/mail";
import { leadName, logLeadEvent, type LeadRow } from "@/lib/leads";
import { absoluteUrl } from "@/lib/site";

// ---- Labb sales quotes ----
// A rep builds a quote for a lead (clinic, employer or custom) from an HTML template and the price list,
// edits it by hand or with AI prompts, approves and sends it. The lead opens it on labb.com/quote/<token>,
// adjusts quantities, signs and pays what's due today. Lab and MRO services are invoiced later as used.

export const QUOTE_KINDS = [
  { value: "clinic", label: "Clinic or testing site", blurb: "Labb Station, readers, stands, rapid kits and lab services for a clinic." },
  { value: "employer", label: "Employer", blurb: "LabbHR, rapid kits and lab services for an employer's program." },
  { value: "custom", label: "Custom", blurb: "Start empty and add exactly what the lead needs." },
] as const;
export type QuoteKind = (typeof QUOTE_KINDS)[number]["value"];
export const isQuoteKind = (v: unknown): v is QuoteKind => QUOTE_KINDS.some((k) => k.value === v);

// Labb quote pricing has two tiers by monthly kit volume. Reps adjust individual lines when needed.
// (CPP prices are CPP members' cost and are never used for Labb quotes.)
export const PRICE_LEVELS = [
  { value: "under100", label: "Under 100 kits per month" },
  { value: "over100", label: "100+ kits per month" },
] as const;
export type PriceLevel = (typeof PRICE_LEVELS)[number]["value"];
export const isPriceLevel = (v: unknown): v is PriceLevel => PRICE_LEVELS.some((k) => k.value === v);
export const defaultLevel = (_k: QuoteKind): PriceLevel => "under100";
export const QUOTE_PRICE_CATEGORIES = [
  { value: "saas", label: "Software" }, { value: "services", label: "Setup and services" }, { value: "readers", label: "Readers and systems" },
  { value: "stands", label: "Stands and accessories" }, { value: "rapid-kits", label: "Rapid test kits" }, { value: "lab-mro", label: "Lab tests and MRO (billed as used)" },
] as const;

export const QUOTE_STATUS: Record<string, string> = {
  draft: "Draft", sent: "Sent", viewed: "Opened", signed: "Signed, awaiting payment", paid: "Accepted and paid", declined: "Declined", expired: "Expired",
};
export const BILLING_LABEL: Record<string, string> = { once: "One time", monthly: "Monthly", invoiced: "Billed as used" };

export type SalesQuote = {
  id: string; lead_id: string; kind: QuoteKind; title: string; status: string; template_id: string | null; html: string; price_level: PriceLevel;
  rep_id: string | null; token: string; expires_on: Date; notes: string | null; sent_at: Date | null; first_opened_at: Date | null; last_opened_at: Date | null;
  open_count: number; signed_at: Date | null; signed_name: string | null; signed_title: string | null; signature_png: string | null; signed_ip: string | null;
  signed_hash: string | null; paid_at: Date | null; paid_cents: number | null; stripe_session: string | null; created_at: Date; updated_at: Date;
};
export type QuoteItem = {
  id: string; quote_id: string; price_item_id: string | null; name: string; sku: string | null; category: string | null; description: string | null; unit: string | null;
  unit_cents: number; qty: number; min_qty: number; adjustable: boolean; billing: "once" | "monthly" | "invoiced"; sort: number; excluded?: boolean;
};
export type PriceRow = { id: string; category: string; name: string; sku: string | null; description: string | null; unit: string | null; under100_cents: number | null; over100_cents: number | null; sort: number; active: boolean };

export const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
export const quoteUrl = (token: string) => absoluteUrl(`/quote/${token}`);
export const quoteNumber = (q: { id: string | number; created_at: Date }) => `Q-${new Date(q.created_at).getFullYear()}-${String(q.id).padStart(4, "0")}`;
const fmtDay = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export function priceFor(p: Pick<PriceRow, "under100_cents" | "over100_cents">, level: PriceLevel) {
  return (level === "over100" ? p.over100_cents ?? p.under100_cents : p.under100_cents ?? p.over100_cents) ?? 0;
}
export const billingFor = (category: string | null): QuoteItem["billing"] => (category === "saas" ? "monthly" : category === "lab-mro" ? "invoiced" : "once");

// Starting line items for each kind of quote, from the active price list (quantities start at 0 for the rep to set).
async function starterItems(kind: QuoteKind) {
  if (kind === "custom") return [];
  const rows = await sql()<PriceRow[]>`select * from quote_price_items where active order by sort, name`;
  const want = (p: PriceRow) => {
    const n = `${p.name} ${p.sku || ""}`.toLowerCase();
    if (kind === "clinic") return p.category !== "saas" || !/labbhr|labbpo|labbmd/.test(n);
    return p.category === "rapid-kits" || p.category === "lab-mro" || p.category === "services" || (p.category === "saas" && /labbhr/.test(n));
  };
  const catOrder: Record<string, number> = { saas: 1, services: 2, readers: 3, stands: 4, "rapid-kits": 5, "lab-mro": 6 };
  return rows.filter(want).sort((a, b) => (catOrder[a.category] ?? 9) - (catOrder[b.category] ?? 9) || a.sort - b.sort).map((p, i) => ({ p, sort: i * 10 }));
}

// What the lead can change on their quote: quantities of every priced one-time item (equipment, kits, other products).
// Never software (SaaS), included items or lab and MRO services billed as used.
// Rapid tests are sold in boxes of 25: the price is per test, the quantity is boxes.
export const KIT_BOX = 25;
export const packOf = (i: { category?: string | null }) => (i.category === "rapid-kits" ? KIT_BOX : 1);
export const lineCents = (i: { category?: string | null; unit_cents: number; qty: number }) => i.unit_cents * i.qty * packOf(i);

export const leadCanEdit = (i: Pick<QuoteItem, "billing" | "unit_cents">) => i.billing === "once" && i.unit_cents > 0;

export function totals(items: (Pick<QuoteItem, "unit_cents" | "qty" | "billing"> & { excluded?: boolean; category?: string | null })[]) {
  let once = 0, monthly = 0;
  for (const i of items) {
    if (i.excluded) continue;
    if (i.billing === "once") once += lineCents(i);
    else if (i.billing === "monthly") monthly += lineCents(i);
  }
  return { once, monthly, dueToday: once + monthly };
}

// ---- Templates ----
// Uploaded templates use these placeholders. Anything else in the HTML is kept as written.
export const PLACEHOLDERS: [string, string][] = [
  ["{{client_name}}", "Lead's name"], ["{{client_company}}", "Organization"], ["{{client_email}}", "Lead's email"], ["{{client_location}}", "City and state"],
  ["{{quote_title}}", "Quote title"], ["{{quote_number}}", "Quote number, like Q-2026-0012"], ["{{quote_date}}", "Date sent"], ["{{expires_on}}", "Valid until"],
  ["{{rep_name}}", "Rep's name"], ["{{rep_email}}", "Rep's email"], ["{{rep_phone}}", "Rep's phone"],
  ["{{client_phone}}", "Lead's phone"], ["{{locations}}", "Number of locations (from the software quantity)"],
  ["{{items_table}}", "Simple table of everything ordered: software, readers, kits, with quantities and prices"], ["{{invoiced_table}}", "Simple table of lab and MRO services billed as used"],
  ["{{price_table}}", "Detailed pricing table (class=\"price\") of everything ordered, grouped by category"],
  ["{{price_table_software}}", "Detailed table: software, readers, stands and other items"], ["{{price_table_kits}}", "Detailed table: rapid test kits"],
  ["{{lab_table}}", "Detailed table: lab and MRO services billed as used"],
  ["{{signature_block}}", "The lead's e-signature, name, title and date once signed"], ["{{client_signature}}", "Same, laid out for an agreement's client signature column"],
  ["{{effective_date}}", "Date the quote was signed (blank line until then)"],
  ["{{one_time_total}}", "One-time total"], ["{{monthly_total}}", "Monthly total"], ["{{due_today}}", "Due at acceptance"],
];

export const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{{quote_title}}</title>
<style>
  body { font-family: Poppins, Arial, Helvetica, sans-serif; color: #404951; margin: 0; padding: 32px 40px; line-height: 1.55; font-size: 15px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #CF743C; padding-bottom: 18px; }
  .brand { font-size: 30px; font-weight: 800; letter-spacing: -.5px; }
  .meta { text-align: right; font-size: 13px; color: #5f6a74; }
  h1 { font-size: 24px; margin: 28px 0 4px; }
  h2 { font-size: 17px; margin: 28px 0 10px; color: #404951; }
  .muted { color: #5f6a74; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; background: #404951; color: #fff; padding: 9px 10px; font-weight: 600; }
  td { padding: 9px 10px; border-bottom: 1px solid #e3e7ea; vertical-align: top; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .totals { margin-top: 16px; margin-left: auto; width: 320px; }
  .totals td { border: 0; padding: 4px 10px; }
  .totals tr.due td { font-weight: 700; font-size: 16px; border-top: 2px solid #CF743C; padding-top: 8px; }
  .note { background: #f4f6f7; border-left: 4px solid #CF743C; padding: 12px 16px; margin-top: 24px; font-size: 14px; }
  .foot { margin-top: 36px; font-size: 12px; color: #5f6a74; border-top: 1px solid #e3e7ea; padding-top: 12px; }
</style></head>
<body>
  <div class="top">
    <div><div class="brand">Labb</div><div class="muted">Drug testing software, readers and supplies</div></div>
    <div class="meta">Quote {{quote_number}}<br>Date: {{quote_date}}<br>Valid until: {{expires_on}}</div>
  </div>

  <h1>{{quote_title}}</h1>
  <p class="muted">Prepared for {{client_name}}, {{client_company}} · {{client_location}}</p>

  <p>Thank you for considering Labb. This quote covers the software, readers and test supplies for your program. You can adjust quantities below before you accept. Lab and MRO services are billed later, only as they are used.</p>

  <h2>Your order</h2>
  {{items_table}}
  <table class="totals">
    <tr><td>One-time items</td><td class="num">{{one_time_total}}</td></tr>
    <tr><td>Software, first month</td><td class="num">{{monthly_total}}</td></tr>
    <tr class="due"><td>Due at acceptance</td><td class="num">{{due_today}}</td></tr>
  </table>

  <h2>Lab and MRO services (billed as used)</h2>
  {{invoiced_table}}

  <div class="note">Software is billed monthly after the first month. Applicable taxes and shipping are added at checkout. Prices are valid until {{expires_on}}.</div>

  <h2>Questions?</h2>
  <p>{{rep_name}} · {{rep_email}} · {{rep_phone}}</p>

  <div class="foot">Ramsey Diagnostics Corporation d/b/a Labb · 2115 Granby Street, Norfolk, VA 23517 · info@labb.com</div>
</body></html>`;

// Uploaded and AI-edited HTML is shown to leads, so scripts, embeds and event handlers are removed.
// It's also shown in a sandboxed frame that can't run scripts.
export function cleanHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(iframe|object|embed|frame|frameset|applet|base|meta\s+http-equiv)[^>]*>([\s\S]*?<\/\1\s*>)?/gi, "")
    .replace(/<\/?(script|iframe|object|embed|form|input|button|textarea|select)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|action|xlink:href)\s*=\s*("|')\s*(javascript|vbscript|data:text\/html)[^"']*\2/gi, '$1="#"')
    .slice(0, 1_500_000);
}

// Images built into an uploaded template (data: URLs) are stored once and linked, so templates stay small.
export async function extractImages(html: string) {
  const db = sql();
  const found = new Map<string, string>();
  const re = /data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,([A-Za-z0-9+/=\s]+)/g;
  for (const m of html.matchAll(re)) {
    if (found.has(m[0])) continue;
    const buf = Buffer.from(m[2].replace(/\s/g, ""), "base64");
    if (!buf.length || buf.length > 8_000_000) continue;
    const ext = m[1] === "svg+xml" ? "svg" : m[1] === "jpeg" ? "jpg" : m[1];
    const id = `${createHash("sha256").update(buf).digest("hex").slice(0, 24)}.${ext}`;
    await db`insert into quote_assets (id, mime, data) values (${id}, ${`image/${m[1] === "jpg" ? "jpeg" : m[1]}`}, ${buf}) on conflict (id) do nothing`;
    found.set(m[0], `/api/quote-asset/${id}`);
  }
  let out = html;
  for (const [k, v] of found) out = out.split(k).join(v);
  return { html: out, images: found.size };
}

export async function ensureDefaultTemplate() {
  const db = sql();
  const [t] = await db<{ id: string }[]>`select id::text from quote_templates order by id limit 1`;
  if (t) return t.id;
  const [n] = await db<{ id: string }[]>`insert into quote_templates (name, kind, html, notes) values ('Labb standard quote', 'any', ${DEFAULT_TEMPLATE}, 'Built-in starting template. Upload your own under Quote templates.') returning id::text`;
  return n.id;
}

type Rep = { name: string; email: string; phone: string | null } | null;

function itemsTable(items: QuoteItem[]) {
  const rows = items.filter((i) => i.billing !== "invoiced" && i.qty > 0);
  if (!rows.length) return `<p class="muted">No items yet.</p>`;
  return `<table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead><tbody>${rows.map((i) =>
    `<tr><td><strong>${esc(i.name)}</strong>${i.sku ? ` <span class="muted">${esc(i.sku)}</span>` : ""}${i.description ? `<br><span class="muted">${esc(i.description)}</span>` : ""}</td>
      <td class="num">${packOf(i) > 1 ? `${i.qty.toLocaleString()} ${i.qty === 1 ? "box" : "boxes"}` : `${i.qty.toLocaleString()}${i.unit ? ` ${esc(i.unit)}` : ""}`}</td><td class="num">${packOf(i) > 1 ? `${money(i.unit_cents)} per test<br>${money(i.unit_cents * KIT_BOX)} per box of ${KIT_BOX}` : `${money(i.unit_cents)}${i.billing === "monthly" ? "/mo" : ""}`}</td><td class="num">${money(lineCents(i))}${i.billing === "monthly" ? "/mo" : ""}</td></tr>`).join("")}</tbody></table>`;
}
function invoicedTable(items: QuoteItem[]) {
  const rows = items.filter((i) => i.billing === "invoiced");
  if (!rows.length) return `<p class="muted">None included.</p>`;
  return `<table><thead><tr><th>Service</th><th class="num">Price</th></tr></thead><tbody>${rows.map((i) =>
    `<tr><td><strong>${esc(i.name)}</strong>${i.description ? `<br><span class="muted">${esc(i.description)}</span>` : ""}</td><td class="num">${money(i.unit_cents)}${i.unit ? ` per ${esc(i.unit.replace(/^per\s+/i, ""))}` : ""}</td></tr>`).join("")}</tbody></table>`;
}

const CAT_LABEL: Record<string, string> = { saas: "Software", services: "Setup and services", readers: "Hardware", stands: "Hardware", "rapid-kits": "Rapid tests", "lab-mro": "Laboratory testing and MRO" };
// Detailed table with the same columns as the Labb Station proposal (class="price", section rows by category).
function priceTable(items: QuoteItem[], empty: string) {
  if (!items.length) return `<p class="muted note">${esc(empty)}</p>`;
  let last = "";
  const rows = items.map((i) => {
    const sect = CAT_LABEL[i.category || ""] || "Other";
    const head = sect !== last ? `<tr class="sect"><td colspan="5">${esc((last = sect))}</td></tr>` : "";
    const unit = i.unit ? i.unit.replace(/^per\s+/i, "") : "";
    const box = packOf(i) > 1;
    const billing = box ? `One time, per box of ${KIT_BOX}` : i.billing === "monthly" ? `Monthly${unit ? `, per ${esc(unit)}` : ""}` : i.billing === "invoiced" ? `Per ${esc(unit || "test")}, billed as used` : `One time${unit ? `, per ${esc(unit)}` : ""}`;
    return `${head}<tr><td><span class="sku">${esc(i.name)}</span>${i.description ? `<br><span class="desc">${esc(i.description)}</span>` : ""}</td><td>${billing}</td>
      <td class="num">${i.billing === "invoiced" ? "" : i.qty ? `${i.qty.toLocaleString()}${box ? (i.qty === 1 ? " box" : " boxes") : ""}` : i.billing === "monthly" ? "Not included" : "Optional"}</td><td class="num">${box && i.unit_cents ? `${money(i.unit_cents * KIT_BOX)} per box<br><span class="desc">${money(i.unit_cents)} per test</span>` : i.unit_cents ? `${money(i.unit_cents)}${i.billing === "monthly" ? "/mo" : ""}` : i.billing === "invoiced" ? "Contact Labb sales" : "Included"}</td>
      <td class="num">${i.billing === "invoiced" ? "As used" : !i.qty ? "" : i.unit_cents ? `${money(lineCents(i))}${i.billing === "monthly" ? "/mo" : ""}` : "Included"}</td></tr>`;
  }).join("");
  return `<table class="price"><thead><tr><th style="width:40%">Item</th><th>Billing</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table>`;
}
const fmtSigned = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
function signature(q: SalesQuote, agreement: boolean) {
  if (!q.signed_at) return `<div class="esig"><div class="pending">${agreement ? "Signed electronically when the client accepts this quote on labb.com." : "Sign electronically on labb.com, below this quote, to accept."}</div></div>`;
  const img = q.signature_png && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(q.signature_png) ? `<img src="${q.signature_png}" alt="Signature">` : "";
  return `<div class="esig">${img}<div class="who"><strong>${esc(q.signed_name || "")}</strong>${q.signed_title ? `, ${esc(q.signed_title)}` : ""}<br>Signed electronically ${fmtSigned(q.signed_at)}</div></div>`;
}

// The quote as the lead sees it: the template with placeholders filled in.
export function renderQuote(q: SalesQuote, allItems: QuoteItem[], lead: LeadRow, rep: Rep) {
  const items = allItems.filter((i) => !i.excluded);
  const t = totals(items);
  const vals: Record<string, string> = {
    "{{client_name}}": esc(leadName(lead)), "{{client_company}}": esc(lead.company || leadName(lead)), "{{client_email}}": esc(lead.email),
    "{{client_location}}": esc([lead.city, lead.state].filter(Boolean).join(", ")), "{{quote_title}}": esc(q.title), "{{quote_number}}": quoteNumber(q),
    "{{quote_date}}": fmtDay(q.sent_at || q.created_at), "{{expires_on}}": fmtDay(q.expires_on), "{{rep_name}}": esc(rep?.name || "The Labb team"),
    "{{rep_email}}": esc(rep?.email || "info@labb.com"), "{{rep_phone}}": esc(rep?.phone || "(877) 868-9967"),
    "{{items_table}}": itemsTable(items), "{{invoiced_table}}": invoicedTable(items),
    "{{one_time_total}}": money(t.once), "{{monthly_total}}": money(t.monthly), "{{due_today}}": money(t.dueToday),
    "{{client_phone}}": esc(lead.phone || ""),
    "{{locations}}": String(items.filter((i) => i.billing === "monthly" && i.qty > 0).reduce((m, i) => Math.max(m, i.qty), 0) || ""),
    "{{price_table}}": priceTable(items.filter((i) => i.billing !== "invoiced"), "No items yet."),
    "{{price_table_software}}": priceTable(items.filter((i) => i.billing !== "invoiced" && i.category !== "rapid-kits"), "No software or hardware in this quote."),
    "{{price_table_kits}}": priceTable(items.filter((i) => i.billing !== "invoiced" && i.category === "rapid-kits"), "No rapid tests in this quote yet."),
    "{{lab_table}}": priceTable(items.filter((i) => i.billing === "invoiced"), "No lab services in this quote."),
    "{{signature_block}}": signature(q, false), "{{client_signature}}": signature(q, true),
    "{{effective_date}}": q.signed_at ? fmtSigned(q.signed_at) : "Date of acceptance",
  };
  // Client type check boxes in the template (Workplace, Clinic, Forensic, Treatment), from the lead's segment or the quote kind.
  const seg = String(lead.segment || "");
  const type = ({ employer: "Workplace", tpa: "Workplace", laboratory: "Workplace", "drug-testing-business": "Workplace", "collection-site": "Clinic", corrections: "Forensic", treatment: "Treatment" } as Record<string, string>)[seg]
    || (q.kind === "employer" ? "Workplace" : q.kind === "clinic" ? "Clinic" : "");
  let out = cleanHtml(q.html).replace(/\{\{\s*[a-z_]+\s*\}\}/g, (m) => vals[m.replace(/\s/g, "")] ?? m);
  if (type) out = out.replace(new RegExp(`<span class="check"></span>(\\s*)${type}\\b`), `<span class="check" style="background:#CF743C;border-color:#CF743C;box-shadow:inset 0 0 0 1.5pt #fff"></span>$1<b>${type}</b>`);
  return out;
}

// ---- Data ----
export async function getQuote(id: string) {
  const db = sql();
  const [q] = await db<SalesQuote[]>`select * from sales_quotes where id = ${/^\d+$/.test(id) ? id : "0"}`;
  if (!q) return null;
  const items = await db<QuoteItem[]>`select i.*, coalesce(i.category, p.category) as category from sales_quote_items i left join quote_price_items p on p.id = i.price_item_id where i.quote_id = ${q.id}
    order by coalesce(array_position(array['saas','services','readers','stands','rapid-kits','lab-mro'], coalesce(i.category, p.category)), 7), i.sort, i.id`;
  return { q, items };
}
export async function getQuoteByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,60}$/.test(token)) return null;
  const db = sql();
  const [q] = await db<SalesQuote[]>`select * from sales_quotes where token = ${token}`;
  if (!q) return null;
  const items = await db<QuoteItem[]>`select i.*, coalesce(i.category, p.category) as category from sales_quote_items i left join quote_price_items p on p.id = i.price_item_id where i.quote_id = ${q.id} and not i.excluded order by i.sort, i.id`;
  const [lead] = await db<LeadRow[]>`select * from leads where id = ${q.lead_id}`;
  const [rep] = q.rep_id ? await db<{ name: string; email: string; phone: string | null }[]>`select name, email, phone from members where id = ${q.rep_id}` : [];
  return lead ? { q, items, lead, rep: rep ?? null } : null;
}
export async function repFor(q: SalesQuote): Promise<Rep> {
  if (!q.rep_id) return null;
  const [r] = await sql()<{ name: string; email: string; phone: string | null }[]>`select name, email, phone from members where id = ${q.rep_id}`;
  return r ?? null;
}

export async function createQuote(lead: LeadRow, kind: QuoteKind, templateId: string | null, by: { id: string; name: string }) {
  const db = sql();
  await ensureDefaultTemplate();
  const [byKind] = await db<{ id: string }[]>`select id::text from quote_templates where active and kind = ${kind} order by updated_at desc limit 1`;
  const tid = templateId && /^\d+$/.test(templateId) ? templateId : byKind?.id ?? (await ensureDefaultTemplate());
  const [t] = await db<{ id: string; html: string }[]>`select id::text, html from quote_templates where id = ${tid}`;
  const html = t?.html || DEFAULT_TEMPLATE;
  const level = defaultLevel(kind);
  const title = kind === "clinic" ? `Labb Station quote for ${lead.company || leadName(lead)}` : kind === "employer" ? `LabbHR drug testing program for ${lead.company || leadName(lead)}` : `Labb quote for ${lead.company || leadName(lead)}`;
  const starters = await starterItems(kind);
  return db.begin(async (tx) => {
    const [q] = await tx<{ id: string }[]>`insert into sales_quotes (lead_id, kind, title, template_id, html, price_level, rep_id, created_by, token)
      values (${lead.id}, ${kind}, ${title}, ${t?.id ?? null}, ${html}, ${level}, ${by.id}, ${by.id}, ${randomBytes(24).toString("base64url")}) returning id::text`;
    for (const { p, sort } of starters) {
      await tx`insert into sales_quote_items (quote_id, price_item_id, name, sku, category, description, unit, unit_cents, qty, min_qty, adjustable, billing, sort)
        values (${q.id}, ${p.id}, ${p.name}, ${p.sku}, ${p.category}, ${p.description}, ${p.unit}, ${priceFor(p, level)}, ${p.category === "services" ? 1 : 0}, 0, ${p.category !== "lab-mro" && p.category !== "services"}, ${billingFor(p.category)}, ${sort})`;
    }
    return q.id;
  });
}

export async function snapshot(quoteId: string, by: string | null, prompt: string | null, summary: string | null) {
  const db = sql();
  const [q] = await db<{ html: string }[]>`select html from sales_quotes where id = ${quoteId}`;
  const items = await db`select price_item_id, name, sku, category, description, unit, unit_cents, qty, min_qty, adjustable, billing, sort, excluded from sales_quote_items where quote_id = ${quoteId} order by sort, id`;
  await db`insert into sales_quote_versions (quote_id, html, items, prompt, summary, created_by) values (${quoteId}, ${q.html}, ${db.json(items as never)}, ${prompt}, ${summary}, ${by})`;
}

export async function restoreVersion(quoteId: string, versionId: string) {
  const db = sql();
  const [v] = await db<{ html: string; items: Omit<QuoteItem, "id" | "quote_id">[] }[]>`select html, items from sales_quote_versions where id = ${versionId} and quote_id = ${quoteId}`;
  if (!v) return false;
  await db.begin(async (tx) => {
    await tx`update sales_quotes set html = ${v.html}, updated_at = now() where id = ${quoteId}`;
    await tx`delete from sales_quote_items where quote_id = ${quoteId}`;
    for (const i of v.items) {
      await tx`insert into sales_quote_items (quote_id, price_item_id, name, sku, category, description, unit, unit_cents, qty, min_qty, adjustable, billing, sort, excluded)
        values (${quoteId}, ${i.price_item_id}, ${i.name}, ${i.sku}, ${i.category}, ${i.description}, ${i.unit}, ${i.unit_cents}, ${i.qty}, ${i.min_qty}, ${i.adjustable}, ${i.billing}, ${i.sort}, ${i.excluded ?? false})`;
    }
  });
  return true;
}

// ---- AI edits: the rep describes a change ("make the intro shorter", "drop kits to $4.25") ----
export const aiReady = () => !!process.env.ANTHROPIC_API_KEY;

export async function aiEdit(quoteId: string, prompt: string, by: { id: string; name: string }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("AI editing needs ANTHROPIC_API_KEY set in Render.");
  const data = await getQuote(quoteId);
  if (!data) throw new Error("Quote not found.");
  const { q } = data; const items = data.items.filter((x) => !x.excluded);
  const itemJson = items.map((i) => ({ id: i.id, name: i.name, sku: i.sku, description: i.description, unit: i.unit, price_dollars: i.unit_cents / 100, qty: i.qty, min_qty: i.min_qty, adjustable: i.adjustable, billing: i.billing }));
  const system = `You edit sales quotes for Labb (Ramsey Diagnostics Corporation d/b/a Labb), a drug testing software and supplies company.
You get the quote's HTML template and its line items as JSON, plus the sales rep's request. Make only the change requested.
Rules:
- Keep every {{placeholder}} exactly as written unless the rep asks to remove that section. Placeholders are filled in later.
- Do not add scripts, forms, iframes or external resources. Keep the existing styles and structure.
- Never use em dashes. Use the colors already in the template; never add blue.
- Change prices or quantities only when asked. Prices are in dollars. Never make up products.
- To remove a line item, list its id in remove_ids. To add one, put it in add_items (name, price_dollars, qty, billing: once, monthly or invoiced, unit, description).
- "billing": once is paid at acceptance; monthly is software billed monthly; invoiced is lab or MRO services billed later as used.
Reply with JSON only, no other text:
{"html": "<full updated HTML, or null if unchanged>", "items": [{"id": "...", "name"?: "...", "description"?: "...", "price_dollars"?: 0, "qty"?: 0, "min_qty"?: 0, "adjustable"?: true}], "remove_ids": [], "add_items": [], "summary": "one sentence describing what changed"}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.QUOTE_MODEL || process.env.ASK_MODEL || "claude-sonnet-5-5", max_tokens: 16000, system,
      messages: [{ role: "user", content: `Quote title: ${q.title}\n\nLine items:\n${JSON.stringify(itemJson)}\n\nTemplate HTML:\n${q.html}\n\nRep's request: ${prompt}` }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const j = (await res.json().catch(() => ({}))) as { content?: { type: string; text?: string }[]; error?: { message?: string } };
  if (!res.ok) throw new Error(`AI request failed: ${j.error?.message || res.status}`);
  const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) throw new Error("The AI reply couldn't be read. Try rewording the request.");
  type Out = { html?: string | null; items?: { id: string; name?: string; description?: string; price_dollars?: number; qty?: number; min_qty?: number; adjustable?: boolean }[]; remove_ids?: string[]; add_items?: { name: string; price_dollars: number; qty?: number; billing?: string; unit?: string; description?: string }[]; summary?: string };
  let out: Out;
  try { out = JSON.parse(m[0]); } catch { throw new Error("The AI reply couldn't be read. Try rewording the request."); }

  await snapshot(quoteId, by.id, null, "Before AI edit");
  const db = sql();
  const cents = (d: unknown) => (typeof d === "number" && Number.isFinite(d) && d >= 0 && d < 10_000_000 ? Math.round(d * 100) : null);
  const int = (n: unknown) => (typeof n === "number" && Number.isInteger(n) && n >= 0 && n < 1_000_000 ? n : null);
  await db.begin(async (tx) => {
    if (out.html && typeof out.html === "string" && out.html.length > 50) await tx`update sales_quotes set html = ${cleanHtml(out.html)} where id = ${quoteId}`;
    for (const u of out.items || []) {
      const cur = items.find((i) => String(i.id) === String(u.id));
      if (!cur) continue;
      await tx`update sales_quote_items set name = ${(u.name || cur.name).slice(0, 200)}, description = ${u.description !== undefined ? (u.description || null) : cur.description},
        unit_cents = ${cents(u.price_dollars) ?? cur.unit_cents}, qty = ${int(u.qty) ?? cur.qty}, min_qty = ${int(u.min_qty) ?? cur.min_qty},
        adjustable = ${typeof u.adjustable === "boolean" ? u.adjustable : cur.adjustable} where id = ${cur.id}`;
    }
    const rm = (out.remove_ids || []).map(String).filter((x) => items.some((i) => String(i.id) === x));
    if (rm.length) await tx`delete from sales_quote_items where quote_id = ${quoteId} and id = any(${rm}::bigint[])`;
    let sort = Math.max(0, ...items.map((i) => i.sort)) + 10;
    for (const a of (out.add_items || []).slice(0, 20)) {
      if (!a.name || cents(a.price_dollars) === null) continue;
      const billing = a.billing === "monthly" || a.billing === "invoiced" ? a.billing : "once";
      await tx`insert into sales_quote_items (quote_id, name, description, unit, unit_cents, qty, billing, adjustable, sort)
        values (${quoteId}, ${a.name.slice(0, 200)}, ${a.description || null}, ${a.unit || null}, ${cents(a.price_dollars)}, ${int(a.qty) ?? 1}, ${billing}, ${billing !== "invoiced"}, ${(sort += 10)})`;
    }
    await tx`update sales_quotes set updated_at = now() where id = ${quoteId}`;
  });
  const summary = (out.summary || "Quote updated.").slice(0, 400);
  await snapshot(quoteId, by.id, prompt.slice(0, 2000), summary);
  await logLeadEvent(q.lead_id, "quote", `AI edit on quote ${quoteNumber(q)}: ${summary}`, by);
  return summary;
}

// ---- Sending, opening, signing ----
export async function sendQuote(quoteId: string, by: { id: string; name: string }) {
  const data = await getQuote(quoteId);
  if (!data) throw new Error("Quote not found.");
  const { q, items } = data;
  const db = sql();
  const [lead] = await db<LeadRow[]>`select * from leads where id = ${q.lead_id}`;
  if (!lead) throw new Error("Lead not found.");
  if (!items.some((i) => i.qty > 0 || i.billing === "invoiced")) throw new Error("Add at least one item with a quantity before sending.");
  const rep = (await repFor(q)) ?? { name: by.name, email: "info@labb.com", phone: null };
  const url = quoteUrl(q.token);
  const t = totals(items);
  const html = emailLayout(`Your quote from Labb`,
    `<p>Hi ${esc(lead.first_name || "there")},</p>
     <p>${esc(rep.name)} has prepared your quote: <strong>${esc(q.title)}</strong> (${quoteNumber(q)}).</p>
     <p>Open it to review the details. You can change the number of test kits, readers and other items before you accept, then sign and complete your order online. Due at acceptance: <strong>${money(t.dueToday)}</strong>${t.monthly ? `, including the first month of software` : ""}. Lab services are billed later, only as used.</p>
     <p>This quote is valid until ${fmtDay(q.expires_on)}. Questions? Just reply to this email.</p>`,
    { href: url, label: "Open your quote" });
  const text = `Hi ${lead.first_name || "there"},\n\n${rep.name} has prepared your quote: ${q.title} (${quoteNumber(q)}).\n\nOpen it here: ${url}\n\nYou can change quantities, then sign and complete your order online. Due at acceptance: ${money(t.dueToday)}. Valid until ${fmtDay(q.expires_on)}.\n\n${rep.name}\nLabb`;
  const sent = await sendMail(lead.email, `Your Labb quote: ${q.title}`, html, text, { replyTo: rep.email, track: { sales_quote: String(q.id) } });
  if (!sent) throw new Error("The email didn't send. Check the email settings.");
  await db`update sales_quotes set status = case when status = 'draft' then 'sent' else status end, sent_at = coalesce(sent_at, now()), approved_by = ${by.id}, updated_at = now() where id = ${q.id}`;
  // Sending a quote moves the lead to Quote sent, unless it's already further along or closed.
  await db`update leads set status = 'quote-sent', updated_at = now() where id = ${q.lead_id} and status in ('new', 'contacted', 'qualified', 'quote-requested')`;
  await snapshot(String(q.id), by.id, null, "Approved and sent");
  await logLeadEvent(q.lead_id, "quote", `Quote ${quoteNumber(q)} approved and emailed to ${lead.email} (due at acceptance ${money(t.dueToday)})`, by);
  return lead.email;
}

// The lead opened the quote: count it and tell the rep (at most once an hour).
export async function recordOpen(q: SalesQuote, lead: LeadRow) {
  const db = sql();
  const [r] = await db<{ notify: boolean }[]>`update sales_quotes set open_count = open_count + 1, first_opened_at = coalesce(first_opened_at, now()),
      status = case when status = 'sent' then 'viewed' else status end, updated_at = now(), last_opened_at = now()
    where id = ${q.id} returning (${q.last_opened_at}::timestamptz is null or ${q.last_opened_at}::timestamptz < now() - interval '1 hour') as notify`;
  if (!q.first_opened_at) await logLeadEvent(q.lead_id, "quote", `Opened quote ${quoteNumber(q)}`, null);
  const rep = await repFor(q);
  if (r?.notify && rep) {
    await sendMail(rep.email, `${leadName(lead)} opened quote ${quoteNumber(q)}`,
      emailLayout("Your quote was opened", `<p><strong>${esc(leadName(lead))}</strong>${lead.company ? `, ${esc(lead.company)}` : ""} just opened <strong>${esc(q.title)}</strong> (${quoteNumber(q)}).</p><p>Opened ${q.open_count + 1} ${q.open_count + 1 === 1 ? "time" : "times"} so far. A good moment to follow up: ${esc(lead.email)}${lead.phone ? ` · ${esc(lead.phone)}` : ""}.</p>`,
        { href: absoluteUrl(`/admin/sales-quotes/${q.id}`), label: "Open the quote" }),
      `${leadName(lead)} opened quote ${quoteNumber(q)} (${q.title}). ${lead.email}${lead.phone ? ` ${lead.phone}` : ""}`, { replyTo: lead.email });
  }
}

export const signatureHash = (q: SalesQuote, items: QuoteItem[]) =>
  createHash("sha256").update(JSON.stringify({ html: q.html, items: items.map((i) => [i.id, i.name, i.unit_cents, i.qty, i.billing]), id: q.id })).digest("hex");

export async function notifyRep(q: SalesQuote, lead: LeadRow, subject: string, body: string) {
  const rep = await repFor(q);
  const to = rep?.email || "info@labb.com";
  await sendMail(to, subject, emailLayout(subject, body, { href: absoluteUrl(`/admin/sales-quotes/${q.id}`), label: "Open the quote" }), body.replace(/<[^>]+>/g, ""), { replyTo: lead.email });
}

// ---- Lead actions ----
// Quantities the lead chose. Only adjustable, non-invoiced items change, never below the minimum.
export async function setQuantities(q: SalesQuote, items: QuoteItem[], qty: Record<string, number>) {
  const db = sql();
  let changed = 0;
  for (const i of items) {
    if (!leadCanEdit(i) || !(String(i.id) in qty)) continue;
    const n = Math.max(i.min_qty, Math.min(100_000, Math.floor(Number(qty[String(i.id)]) || 0)));
    if (n !== i.qty) { await db`update sales_quote_items set qty = ${n} where id = ${i.id} and quote_id = ${q.id}`; changed++; }
  }
  if (changed) await db`update sales_quotes set updated_at = now() where id = ${q.id}`;
  return changed;
}

// Stripe Checkout for what's due at acceptance (one-time items plus the first month of software).
export async function quoteCheckout(q: SalesQuote, items: QuoteItem[], lead: LeadRow) {
  const { stripe } = await import("@/lib/commerce");
  const lines = items.filter((i) => i.billing !== "invoiced" && i.qty > 0 && i.unit_cents > 0).map((i) => ({
    quantity: i.qty,
    price_data: { currency: "usd", unit_amount: i.unit_cents * packOf(i), product_data: { name: `${i.name}${i.billing === "monthly" ? " (first month)" : packOf(i) > 1 ? ` (box of ${KIT_BOX})` : ""}`.slice(0, 250), ...(i.sku ? { description: i.sku } : {}) } },
  }));
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: lines,
    customer_email: lead.email,
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    metadata: { kind: "sales-quote", quoteId: String(q.id), leadId: String(q.lead_id) },
    payment_intent_data: { description: `Labb quote ${quoteNumber(q)}: ${q.title}`.slice(0, 900) },
    success_url: absoluteUrl(`/quote/${q.token}?paid=1`),
    cancel_url: absoluteUrl(`/quote/${q.token}?open=1`),
  });
  await sql()`update sales_quotes set stripe_session = ${session.id} where id = ${q.id}`;
  return session.url!;
}

// Stripe confirmed payment (webhook), or nothing was due: finalize.
export async function markPaid(quoteId: string, cents: number, session: string | null) {
  const db = sql();
  const [q] = await db<SalesQuote[]>`update sales_quotes set status = 'paid', paid_at = now(), paid_cents = ${cents}, stripe_session = coalesce(${session}, stripe_session), updated_at = now()
    where id = ${quoteId} and status <> 'paid' returning *`;
  if (!q) return;
  const [lead] = await db<LeadRow[]>`select * from leads where id = ${q.lead_id}`;
  await db`update leads set status = 'won', updated_at = now() where id = ${q.lead_id} and status not in ('existing-client')`;
  await logLeadEvent(q.lead_id, "paid", `Accepted quote ${quoteNumber(q)} and paid ${money(cents)}${session ? ` (Stripe ${session})` : ""}. Lead marked Won.`, null);
  if (lead) {
    await notifyRep(q, lead, `Quote ${quoteNumber(q)} accepted and paid`, `<p><strong>${esc(leadName(lead))}</strong>${lead.company ? `, ${esc(lead.company)}` : ""} accepted <strong>${esc(q.title)}</strong> and paid <strong>${money(cents)}</strong>.</p><p>Signed by ${esc(q.signed_name || "")}${q.signed_title ? `, ${esc(q.signed_title)}` : ""}. Time to start onboarding and ship the order.</p>`);
    await sendMail(lead.email, `Order confirmed: ${q.title}`,
      emailLayout("Thank you. Your order is confirmed", `<p>Hi ${esc(lead.first_name || "there")},</p><p>We received your signed quote ${quoteNumber(q)} and your payment of <strong>${money(cents)}</strong>. Your Labb team will contact you shortly about onboarding and shipping.</p><p>Lab and MRO services are billed later, only as they are used.</p>`, { href: quoteUrl(q.token), label: "View your quote" }),
      `We received your signed quote ${quoteNumber(q)} and your payment of ${money(cents)}. Your Labb team will contact you shortly. View your quote: ${quoteUrl(q.token)}`);
  }
}
