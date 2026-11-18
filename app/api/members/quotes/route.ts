import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { logLeadEvent } from "@/lib/leads";
import { isQuoteStatus, quoteStatusLabel } from "@/lib/quotes";

const toCents = (v: string) => {
  const n = parseFloat(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 && n < 10_000_000 ? Math.round(n * 100) : null;
};
const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

// CPP members record quotes for leads Labb passed them. Stored for tracking and price analytics; never sent to the client.
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m) return go(req, "/login?next=/members/leads");
  if (!(await sameOrigin())) return go(req, "/members/leads");
  const fd = await req.formData();
  const action = field(fd, "action", 20);
  const back = field(fd, "back", 40) === "quotes" ? "/members/quotes" : "/members/leads";
  const db = sql();
  const actor = { id: m.id, name: m.clinic ? `${m.name} (${m.clinic})` : m.name };
  const fail = async (msg: string) => {
    await setFlash(msg, "error", undefined, "/members");
    return go(req, back);
  };

  if (action === "create") {
    const leadId = field(fd, "lead", 20);
    if (!/^\d+$/.test(leadId)) return go(req, back);
    const [lead] = await db<{ id: string; company: string | null; email: string; state: string | null; industry: string | null; segment: string }[]>`
      select id, company, email, state, industry, segment from leads where id = ${leadId} and partner_id = ${m.id} and owner = 'partner'`;
    if (!lead) return go(req, back);

    const pids = fd.getAll("item_pid").map(String);
    const names = fd.getAll("item_name").map(String);
    const qtys = fd.getAll("item_qty").map(String);
    const prices = fd.getAll("item_price").map(String);
    const vols = fd.getAll("item_vol").map(String);
    const catalog = await db<{ id: string; name: string; sku: string | null; category: string; unit: string | null }[]>`
      select id, name, sku, category, unit from cpp_price_items where id = any(${pids.filter((p) => /^\d+$/.test(p))}::bigint[])`;
    const items: { pid: string | null; name: string; sku: string | null; category: string | null; unit: string | null; qty: number; cents: number; vol: number }[] = [];
    for (let i = 0; i < Math.min(pids.length, 40); i++) {
      const qty = parseInt(qtys[i] || "", 10);
      const cents = toCents(prices[i] || "");
      if (!(qty > 0 && qty < 10_000_000) || cents == null) return fail(`Line ${i + 1} needs a quantity and a unit price.`);
      const vol = parseInt((vols[i] || "").replace(/,/g, ""), 10);
      if (!(vol >= 0 && vol < 100_000_000)) return fail(`Line ${i + 1} needs the expected tests or units per month.`);
      const p = catalog.find((c) => String(c.id) === pids[i]);
      if (p) items.push({ pid: String(p.id), name: p.name, sku: p.sku, category: p.category, unit: p.unit, qty, cents, vol });
      else if (pids[i] === "other" && names[i]?.trim()) items.push({ pid: null, name: names[i].trim().slice(0, 160), sku: null, category: "other", unit: null, qty, cents, vol });
      else return fail(`Choose a product for line ${i + 1}.`);
    }
    if (!items.length) return fail("Add at least one line to the quote.");
    const rawStatus = field(fd, "status", 20);
    const status = isQuoteStatus(rawStatus) ? rawStatus : "sent";
    const date = field(fd, "quoted_on", 10);
    const total = items.reduce((t, i) => t + i.qty * i.cents, 0);
    const [q] = await db<{ id: string }[]>`
      insert into member_quotes (lead_id, member_id, status, quoted_on, state, industry, segment, notes, total_cents)
      values (${lead.id}, ${m.id}, ${status}, ${/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10)},
        ${lead.state ? lead.state.trim().toUpperCase().slice(0, 40) : null}, ${lead.industry}, ${lead.segment}, ${field(fd, "notes", 1000) || null}, ${total})
      returning id`;
    for (const i of items) {
      await db`insert into member_quote_items (quote_id, price_item_id, product_name, sku, category, unit, quantity, unit_price_cents, monthly_volume)
        values (${q.id}, ${i.pid}, ${i.name}, ${i.sku}, ${i.category}, ${i.unit}, ${i.qty}, ${i.cents}, ${i.vol})`;
    }
    await logLeadEvent(lead.id, "note", `Quote recorded: ${items.length} line${items.length > 1 ? "s" : ""}, ${money(total)} (${quoteStatusLabel(status)})`, actor);
    await setFlash(`Saved a ${money(total)} quote for ${lead.company || lead.email}.`, "ok", undefined, "/members");
    return go(req, back);
  }

  const id = field(fd, "id", 20);
  if (!/^\d+$/.test(id)) return go(req, back);
  const [q] = await db<{ id: string; lead_id: string; status: string }[]>`select id, lead_id, status from member_quotes where id = ${id} and member_id = ${m.id}`;
  if (!q) return go(req, back);

  if (action === "status") {
    const status = field(fd, "status", 20);
    if (isQuoteStatus(status) && status !== q.status) {
      await db`update member_quotes set status = ${status}, updated_at = now() where id = ${id}`;
      await logLeadEvent(q.lead_id, "note", `Quote #${id}: ${quoteStatusLabel(q.status)} to ${quoteStatusLabel(status)}`, actor);
    }
  } else if (action === "delete") {
    await db`delete from member_quotes where id = ${id}`;
    await logLeadEvent(q.lead_id, "note", `Quote #${id} deleted`, actor);
    await setFlash("Quote deleted.", "ok", undefined, "/members");
  }
  return go(req, back);
}
