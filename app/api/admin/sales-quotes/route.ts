import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { logLeadEvent, type LeadRow } from "@/lib/leads";
import {
  aiEdit, billingFor, cleanHtml, createQuote, getQuote, isPriceLevel, isQuoteKind, priceFor, quoteNumber, restoreVersion, sendQuote, snapshot,
} from "@/lib/salesQuotes";

// Labb admin actions for sales quotes and quote templates.
export async function POST(req: Request) {
  const me = await currentMember();
  if (!me || me.role !== "admin") return go(req, "/admin-login");
  const fd = await req.formData();
  const action = (fd.getAll("action").map(String).pop() || "").slice(0, 30);
  const backRaw = field(fd, "back", 300);
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");
  const by = { id: me.id, name: me.name };
  const db = sql();
  if (!(await sameOrigin())) return go(req, "/admin/sales-quotes");

  // ---- Templates ----
  if (action.startsWith("template-")) {
    const back = "/admin/sales-quotes/templates";
    const tid = field(fd, "template", 20).replace(/\D/g, "");
    if (action === "template-save") {
      const name = field(fd, "name", 120) || "Untitled template";
      const kind = ["any", "clinic", "employer", "custom"].includes(field(fd, "kind", 20)) ? field(fd, "kind", 20) : "any";
      const file = fd.get("file");
      let html = String(fd.get("html") ?? "");
      if (file && typeof file === "object" && "size" in file && file.size > 0) {
        if (file.size > 400_000) { await flash("That file is too large (400 KB maximum).", "error"); return go(req, back); }
        html = await file.text();
      }
      html = cleanHtml(html).trim();
      if (html.length < 20) { await flash("Upload an .html file or paste the HTML.", "error"); return go(req, back); }
      if (tid) await db`update quote_templates set name = ${name}, kind = ${kind}, html = ${html}, notes = ${field(fd, "notes", 500) || null}, updated_at = now() where id = ${tid}`;
      else await db`insert into quote_templates (name, kind, html, notes, created_by) values (${name}, ${kind}, ${html}, ${field(fd, "notes", 500) || null}, ${me.id})`;
      await flash(tid ? "Template saved." : "Template uploaded.");
    } else if (action === "template-toggle" && tid) {
      await db`update quote_templates set active = not active, updated_at = now() where id = ${tid}`;
      await flash("Template updated.");
    }
    return go(req, back);
  }

  // ---- New quote from a lead ----
  if (action === "create") {
    const leadId = field(fd, "lead", 20).replace(/\D/g, "");
    const kind = field(fd, "kind", 20);
    const [lead] = await db<LeadRow[]>`select * from leads where id = ${leadId || "0"}`;
    if (!lead || !isQuoteKind(kind)) { await flash("Choose the type of quote.", "error"); return go(req, `/admin/leads/${leadId}?tab=quotes`); }
    const id = await createQuote(lead, kind, field(fd, "template", 20) || null, by);
    await logLeadEvent(lead.id, "quote", `Started a ${kind} quote`, by);
    await flash("Quote started. Set quantities and prices, then approve and send.");
    return go(req, `/admin/sales-quotes/${id}`);
  }

  const qid = field(fd, "quote", 20).replace(/\D/g, "");
  const data = await getQuote(qid || "0");
  if (!data) { await flash("Quote not found.", "error"); return go(req, "/admin/sales-quotes"); }
  const { q, items } = data;
  const back = backRaw.startsWith("/admin/") ? backRaw : `/admin/sales-quotes/${q.id}`;
  const locked = q.status === "signed" || q.status === "paid";
  if (locked && !["duplicate"].includes(action)) { await flash("This quote has been signed, so it can't be changed. Duplicate it to make a new version.", "error"); return go(req, back); }

  if (action === "save") {
    await snapshot(String(q.id), me.id, null, "Before manual edit");
    const title = field(fd, "title", 200) || q.title;
    const expires = field(fd, "expires", 10);
    const repIn = field(fd, "rep", 40);
    const [repOk] = /^[0-9a-f-]{36}$/.test(repIn) ? await db`select id from members where id = ${repIn} and role = 'admin'` : [];
    const rep = repOk ? repIn : q.rep_id;
    await db.begin(async (tx) => {
      await tx`update sales_quotes set title = ${title}, expires_on = ${/^\d{4}-\d{2}-\d{2}$/.test(expires) ? expires : q.expires_on}, notes = ${String(fd.get("notes") ?? "").slice(0, 4000) || null},
        rep_id = ${rep},
        status = case when status = 'expired' and ${expires}::text > current_date::text then 'sent' else status end, updated_at = now() where id = ${q.id}`;
      for (const i of items) {
        const g = (k: string) => fd.get(`${k}_${i.id}`);
        if (g("name") === null) continue;
        if (g("del") === "1") { await tx`delete from sales_quote_items where id = ${i.id}`; continue; }
        const cents = Math.round(Number(String(g("price") ?? "").replace(/[^0-9.]/g, "")) * 100);
        const qty = Math.max(0, Math.min(1_000_000, parseInt(String(g("qty") ?? "0"), 10) || 0));
        const min = Math.max(0, Math.min(qty, parseInt(String(g("min") ?? "0"), 10) || 0));
        const billing = ["once", "monthly", "invoiced"].includes(String(g("billing"))) ? String(g("billing")) : i.billing;
        await tx`update sales_quote_items set name = ${String(g("name")).slice(0, 200) || i.name}, description = ${String(g("desc") ?? "").slice(0, 500) || null},
          unit_cents = ${Number.isFinite(cents) && cents >= 0 ? cents : i.unit_cents}, qty = ${qty}, min_qty = ${min}, adjustable = ${g("adj") === "1"}, billing = ${billing} where id = ${i.id}`;
      }
    });
    await snapshot(String(q.id), me.id, null, "Manual edit");
    await flash("Quote saved.");
  } else if (action === "remove-item") {
    await snapshot(String(q.id), me.id, null, "Before removing an item");
    await db`delete from sales_quote_items where quote_id = ${q.id} and id = ${field(fd, "item", 20).replace(/\D/g, "") || "0"}`;
    await flash("Item removed.");
  } else if (action === "remove-empty") {
    await snapshot(String(q.id), me.id, null, "Before removing empty items");
    const r = await db`delete from sales_quote_items where quote_id = ${q.id} and qty = 0 and billing <> 'invoiced'`;
    await flash(`Removed ${r.count} items with no quantity.`);
  } else if (action === "add-item") {
    const pid = field(fd, "price_item", 20).replace(/\D/g, "");
    const sort = Math.max(0, ...items.map((i) => i.sort)) + 10;
    if (pid) {
      const [p] = await db`select * from cpp_price_items where id = ${pid}`;
      if (p) await db`insert into sales_quote_items (quote_id, price_item_id, name, sku, category, description, unit, unit_cents, qty, adjustable, billing, sort)
        values (${q.id}, ${p.id}, ${p.name}, ${p.sku}, ${p.category}, ${p.description}, ${p.unit}, ${priceFor(p as never, q.price_level)}, ${p.category === "lab-mro" ? 0 : 1}, ${p.category !== "lab-mro"}, ${billingFor(p.category)}, ${sort})`;
    } else {
      const name = field(fd, "custom_name", 200);
      const cents = Math.round(Number(field(fd, "custom_price", 20).replace(/[^0-9.]/g, "")) * 100);
      const billing = ["once", "monthly", "invoiced"].includes(field(fd, "custom_billing", 10)) ? field(fd, "custom_billing", 10) : "once";
      if (!name || !Number.isFinite(cents)) { await flash("Pick a product, or enter a name and price.", "error"); return go(req, back); }
      await db`insert into sales_quote_items (quote_id, name, unit, unit_cents, qty, adjustable, billing, sort)
        values (${q.id}, ${name}, ${field(fd, "custom_unit", 40) || null}, ${cents}, ${billing === "invoiced" ? 0 : 1}, ${billing !== "invoiced"}, ${billing}, ${sort})`;
    }
    await flash("Item added.");
  } else if (action === "level") {
    const level = field(fd, "level", 10);
    if (isPriceLevel(level)) {
      await snapshot(String(q.id), me.id, null, "Before changing price level");
      const rows = await db`select i.id, p.* from sales_quote_items i join cpp_price_items p on p.id = i.price_item_id where i.quote_id = ${q.id}`;
      for (const r of rows) await db`update sales_quote_items set unit_cents = ${priceFor(r as never, level)} where id = ${r.id}`;
      await db`update sales_quotes set price_level = ${level}, updated_at = now() where id = ${q.id}`;
      await flash("Prices reset to the chosen price level.");
    }
  } else if (action === "html") {
    await snapshot(String(q.id), me.id, null, "Before HTML edit");
    const html = cleanHtml(String(fd.get("html") ?? ""));
    if (html.length < 20) { await flash("The HTML is empty.", "error"); return go(req, back); }
    await db`update sales_quotes set html = ${html}, updated_at = now() where id = ${q.id}`;
    await snapshot(String(q.id), me.id, null, "HTML edit");
    await flash("Quote layout saved.");
  } else if (action === "template") {
    const tid = field(fd, "template", 20).replace(/\D/g, "");
    const [t] = await db<{ html: string }[]>`select html from quote_templates where id = ${tid || "0"}`;
    if (t) {
      await snapshot(String(q.id), me.id, null, "Before switching template");
      await db`update sales_quotes set html = ${t.html}, template_id = ${tid}, updated_at = now() where id = ${q.id}`;
      await flash("Template applied. Prices and quantities are unchanged.");
    }
  } else if (action === "ai") {
    const prompt = String(fd.get("prompt") ?? "").trim().slice(0, 4000);
    if (!prompt) { await flash("Describe the change you want.", "error"); return go(req, back); }
    try {
      const summary = await aiEdit(String(q.id), prompt, by);
      await flash(`AI: ${summary}`);
    } catch (e) {
      await flash(e instanceof Error ? e.message : "The AI edit didn't work.", "error");
    }
  } else if (action === "restore") {
    await snapshot(String(q.id), me.id, null, "Before restoring an earlier version");
    const ok = await restoreVersion(String(q.id), field(fd, "version", 20).replace(/\D/g, "") || "0");
    await flash(ok ? "Earlier version restored." : "That version wasn't found.", ok ? "ok" : "error");
  } else if (action === "send") {
    try {
      const to = await sendQuote(String(q.id), by);
      await flash(`Quote approved and emailed to ${to}. You'll get an email when they open it.`);
    } catch (e) {
      await flash(e instanceof Error ? e.message : "The quote wasn't sent.", "error");
    }
  } else if (action === "decline") {
    await db`update sales_quotes set status = 'declined', updated_at = now() where id = ${q.id}`;
    await logLeadEvent(q.lead_id, "quote", `Quote ${quoteNumber(q)} marked declined`, by);
    await flash("Marked as declined.");
  } else if (action === "duplicate") {
    const [n] = await db<{ id: string }[]>`insert into sales_quotes (lead_id, kind, title, template_id, html, price_level, rep_id, created_by, token, notes)
      select lead_id, kind, title, template_id, html, price_level, rep_id, ${me.id}, ${crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8)}, notes
      from sales_quotes where id = ${q.id} returning id::text`;
    await db`insert into sales_quote_items (quote_id, price_item_id, name, sku, category, description, unit, unit_cents, qty, min_qty, adjustable, billing, sort)
      select ${n.id}, price_item_id, name, sku, category, description, unit, unit_cents, qty, min_qty, adjustable, billing, sort from sales_quote_items where quote_id = ${q.id}`;
    await logLeadEvent(q.lead_id, "quote", `Copied quote ${quoteNumber(q)} into a new draft`, by);
    await flash("Copied into a new draft quote.");
    return go(req, `/admin/sales-quotes/${n.id}`);
  } else if (action === "delete") {
    if (q.status !== "draft") { await flash("Only drafts can be deleted. Mark a sent quote as declined instead.", "error"); return go(req, back); }
    await db`delete from sales_quotes where id = ${q.id}`;
    await flash("Draft deleted.");
    return go(req, `/admin/leads/${q.lead_id}?tab=quotes`);
  }
  return go(req, back);
}
