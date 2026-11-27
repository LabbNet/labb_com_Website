import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import type { PriceRow } from "@/lib/salesQuotes";
import { logLeadEvent, type LeadRow } from "@/lib/leads";
import {
  aiEdit, billingFor, cleanHtml, createQuote, extractImages, getQuote, isPriceLevel, isQuoteKind, priceFor, quoteNumber, restoreVersion, sendQuote, snapshot,
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

  // ---- Quote price list (two tiers) ----
  if (action.startsWith("price-")) {
    const back = "/admin/sales-quotes/prices";
    const cents = (v: string) => { const t = v.replace(/[^0-9.]/g, ""); if (!t) return null; const n = Math.round(Number(t) * 100); return Number.isFinite(n) && n >= 0 ? n : null; };
    const cats = ["saas", "services", "readers", "stands", "rapid-kits", "lab-mro"];
    if (action === "price-save") {
      const ids = fd.getAll("ids").map(String).filter((x) => /^\d+$/.test(x));
      for (const id of ids) {
        const g = (k: string) => String(fd.get(`${k}_${id}`) ?? "");
        if (!g("name").trim()) continue;
        await db`update quote_price_items set name = ${g("name").trim().slice(0, 200)}, sku = ${g("sku").trim().slice(0, 60) || null}, description = ${g("desc").trim().slice(0, 500) || null},
          unit = ${g("unit").trim().slice(0, 40) || null}, under100_cents = ${cents(g("u100"))}, over100_cents = ${cents(g("o100"))},
          category = ${cats.includes(g("cat")) ? g("cat") : "services"}, active = ${g("active") === "1"},
          cpp_item_id = ${/^\d+$/.test(g("cpp")) ? g("cpp") : null}, drugs = ${g("drugs").trim().slice(0, 300) || null}, updated_at = now(), updated_by = ${me.id} where id = ${id}`;
      }
      await flash("Quote prices saved. New quotes use them; quotes already started keep their prices until you reapply a tier.");
    } else if (action === "price-add") {
      const name = field(fd, "name", 200);
      const cat = field(fd, "cat", 20);
      if (!name || !cats.includes(cat)) { await flash("Enter a name and choose a category.", "error"); return go(req, back); }
      await db`insert into quote_price_items (category, name, sku, description, unit, under100_cents, over100_cents, sort, updated_by)
        values (${cat}, ${name}, ${field(fd, "sku", 60) || null}, ${field(fd, "desc", 500) || null}, ${field(fd, "unit", 40) || null}, ${cents(field(fd, "u100", 20))}, ${cents(field(fd, "o100", 20))},
          ${(await db<{ n: number }[]>`select coalesce(max(sort), 0)::int + 10 as n from quote_price_items`)[0].n}, ${me.id})`;
      await flash(`Added ${name}.`);
    }
    return go(req, back);
  }

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
        if (file.size > 9_000_000) { await flash("That file is too large (9 MB maximum).", "error"); return go(req, back); }
        html = await file.text();
      }
      const ex = await extractImages(html);
      html = cleanHtml(ex.html).trim();
      if (html.length < 20) { await flash("Upload an .html file or paste the HTML.", "error"); return go(req, back); }
      if (tid) await db`update quote_templates set name = ${name}, kind = ${kind}, html = ${html}, notes = ${field(fd, "notes", 500) || null}, updated_at = now() where id = ${tid}`;
      else await db`insert into quote_templates (name, kind, html, notes, created_by) values (${name}, ${kind}, ${html}, ${field(fd, "notes", 500) || null}, ${me.id})`;
      await flash(`${tid ? "Template saved" : "Template uploaded"}${ex.images ? ` with ${ex.images} ${ex.images === 1 ? "image" : "images"}` : ""}.`);
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
    const unpriced: string[] = [];
    await snapshot(String(q.id), me.id, null, "Before manual edit");
    const title = field(fd, "title", 200) || q.title;
    const expires = field(fd, "expires", 10);
    const repIn = field(fd, "rep", 40);
    const [repOk] = /^[0-9a-f-]{36}$/.test(repIn) ? await db`select id from members where id = ${repIn} and role = 'admin'` : [];
    const rep = repOk ? repIn : q.rep_id;
    await db.begin(async (tx) => {
      await tx`update sales_quotes set title = ${title}, expires_on = ${/^\d{4}-\d{2}-\d{2}$/.test(expires) ? expires : q.expires_on},
        expires_manual = ${q.expires_manual || (/^\d{4}-\d{2}-\d{2}$/.test(expires) && expires !== new Date(q.expires_on).toISOString().slice(0, 10))}, notes = ${String(fd.get("notes") ?? "").slice(0, 4000) || null},
        rep_id = ${rep},
        status = case when status = 'expired' and ${expires}::text > current_date::text then 'sent' else status end, updated_at = now() where id = ${q.id}`;
      for (const i of items) {
        const g = (k: string) => fd.get(`${k}_${i.id}`);
        if (g("name") === null) continue;
        const excluded = g("del") === "1";
        const cents = Math.round(Number(String(g("price") ?? "").replace(/[^0-9.]/g, "")) * 100);
        const qty = Math.max(0, Math.min(1_000_000, parseInt(String(g("qty") ?? "0"), 10) || 0));
        const min = Math.max(0, Math.min(qty, parseInt(String(g("min") ?? "0"), 10) || 0));
        const billing = ["once", "monthly", "invoiced"].includes(String(g("billing"))) ? String(g("billing")) : i.billing;
        await tx`update sales_quote_items set name = ${String(g("name")).slice(0, 200) || i.name}, description = ${String(g("desc") ?? "").slice(0, 500) || null},
          unit_cents = ${Number.isFinite(cents) && cents >= 0 ? cents : i.unit_cents}, qty = ${qty}, min_qty = ${min}, adjustable = ${billing === "once" && (Number.isFinite(cents) && cents >= 0 ? cents : i.unit_cents) > 0}, billing = ${billing}, excluded = ${excluded} where id = ${i.id}`;
      }
      // Price-list products the rep added from Line items (quantity set, or Add checked for lab and MRO).
      let sort = Math.max(0, ...items.map((i) => i.sort)) + 10;
      const plist = await tx<PriceRow[]>`select * from quote_price_items where active`;
      unpriced.length = 0;
      for (const p of plist) {
        const qtyIn = parseInt(String(fd.get(`newqty_${p.id}`) ?? "0"), 10) || 0;
        const lab = p.category === "lab-mro";
        if (lab ? fd.get(`newadd_${p.id}`) !== "1" : qtyIn <= 0) continue;
        const raw = String(fd.get(`newprice_${p.id}`) ?? "").replace(/[^0-9.]/g, "");
        if (!raw && p.under100_cents == null && p.over100_cents == null && !lab) { unpriced.push(p.name); continue; }
        const cents = raw ? Math.round(Number(raw) * 100) : priceFor(p, isPriceLevel(q.price_level) ? q.price_level : "under100");
        if (!Number.isFinite(cents) || cents < 0) continue;
        await tx`insert into sales_quote_items (quote_id, price_item_id, name, sku, category, description, unit, unit_cents, qty, adjustable, billing, sort)
          values (${q.id}, ${p.id}, ${p.name}, ${p.sku}, ${p.category}, ${p.description}, ${p.unit}, ${cents}, ${lab ? 0 : Math.min(1_000_000, qtyIn)}, ${!lab && p.category !== "services"}, ${billingFor(p.category)}, ${sort})`;
        sort += 10;
      }
    });
    await snapshot(String(q.id), me.id, null, "Manual edit");
    await flash(unpriced.length ? `Quote saved. Not added, because they have no price: ${unpriced.join(", ")}. Enter a price on the line, or set it in Quote prices.` : "Quote saved.", unpriced.length ? "error" : "ok");
  } else if (action === "remove-item") {
    await snapshot(String(q.id), me.id, null, "Before removing an item");
    await db`delete from sales_quote_items where quote_id = ${q.id} and id = ${field(fd, "item", 20).replace(/\D/g, "") || "0"}`;
    await flash("Item removed.");
  } else if (action === "remove-empty") {
    await snapshot(String(q.id), me.id, null, "Before removing empty items");
    const r = await db`update sales_quote_items set excluded = true where quote_id = ${q.id} and qty = 0 and billing <> 'invoiced' and not excluded`;
    await flash(`Removed ${r.count} items with no quantity from the quote. Their prices are kept; uncheck Remove to bring one back.`);
  } else if (action === "add-item") {
    const picks = [...fd.getAll("pick"), fd.get("price_item")].map((v) => String(v ?? "").replace(/\D/g, "").slice(0, 12)).filter(Boolean);
    let sort = Math.max(0, ...items.map((i) => i.sort)) + 10;
    if (picks.length) {
      const have = new Set(items.map((i) => String((i as { price_item_id?: unknown }).price_item_id ?? "")));
      let added = 0;
      for (const pid of picks) {
        if (have.has(pid)) continue;
        const [p] = await db<PriceRow[]>`select * from quote_price_items where id = ${pid}`;
        if (!p) continue;
        await db`insert into sales_quote_items (quote_id, price_item_id, name, sku, category, description, unit, unit_cents, qty, adjustable, billing, sort)
        values (${q.id}, ${p.id}, ${p.name}, ${p.sku}, ${p.category}, ${p.description}, ${p.unit}, ${priceFor(p, isPriceLevel(q.price_level) ? q.price_level : "under100")}, ${p.category === "lab-mro" ? 0 : 1}, ${p.category !== "lab-mro" && p.category !== "services"}, ${billingFor(p.category)}, ${sort})`;
        sort += 10; added++; have.add(pid);
      }
      await flash(added ? `${added} item${added === 1 ? "" : "s"} added.` : "Those products are already in the quote.");
      return go(req, back);
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
      await snapshot(String(q.id), me.id, null, "Before changing the pricing tier");
      const rows = await db<{ line: string; under100_cents: number | null; over100_cents: number | null }[]>`select i.id::text as line, p.under100_cents, p.over100_cents from sales_quote_items i join quote_price_items p on p.id = i.price_item_id where i.quote_id = ${q.id}`;
      for (const r of rows) await db`update sales_quote_items set unit_cents = ${priceFor(r, level)} where id = ${r.line}`;
      await db`update sales_quotes set price_level = ${level}, updated_at = now() where id = ${q.id}`;
      await snapshot(String(q.id), me.id, null, `Pricing tier: ${level === "over100" ? "100+ kits per month" : "under 100 kits per month"}`);
      await flash(`Prices set to the ${level === "over100" ? "100+ kits per month" : "under 100 kits per month"} tier. Custom lines and lines you priced by hand from other items keep their prices.`);
    }
  } else if (action === "html") {
    await snapshot(String(q.id), me.id, null, "Before HTML edit");
    const html = cleanHtml((await extractImages(String(fd.get("html") ?? ""))).html);
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
    await db`insert into sales_quote_items (quote_id, price_item_id, name, sku, category, description, unit, unit_cents, qty, min_qty, adjustable, billing, sort, excluded)
      select ${n.id}, price_item_id, name, sku, category, description, unit, unit_cents, qty, min_qty, adjustable, billing, sort, excluded from sales_quote_items where quote_id = ${q.id}`;
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
