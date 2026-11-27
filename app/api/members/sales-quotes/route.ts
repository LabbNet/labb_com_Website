import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import type { LeadRow } from "@/lib/leads";
import {
  createQuote, getQuote, isPaymentMode, isQuoteKind, isServiceLevel, sendQuote, snapshot, syncCatalogLines,
} from "@/lib/salesQuotes";

// CPP members build, price and send quotes to their own clients. Only quotes they own, for leads assigned to them.
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m) return go(req, "/login?next=/members/quotes");
  if (!(await sameOrigin())) return go(req, "/members/quotes");
  const fd = await req.formData();
  const action = field(fd, "action", 20);
  const db = sql();
  const flash = (msg: string, kind: "ok" | "error" = "ok") => setFlash(msg, kind, undefined, "/members");

  if (action === "create") {
    const leadId = field(fd, "lead", 20).replace(/\D/g, "");
    const [lead] = leadId ? await db<LeadRow[]>`select * from leads where id = ${leadId} and partner_id = ${m.id} and owner = 'partner'` : [];
    if (!lead) { await flash("Pick one of your leads.", "error"); return go(req, "/members/quotes"); }
    const kind = isQuoteKind(field(fd, "kind", 20)) ? (field(fd, "kind", 20) as "clinic" | "employer" | "custom") : "clinic";
    const id = await createQuote(lead, kind, null, { id: m.id, name: m.name }, { memberId: m.id });
    await syncCatalogLines(id);
    await snapshot(id, m.id, null, "Quote created");
    return go(req, `/members/sales-quotes/${id}`);
  }

  const qid = field(fd, "quote", 20).replace(/\D/g, "");
  const data = qid ? await getQuote(qid) : null;
  if (!data || data.q.member_id !== m.id) return go(req, "/members/quotes");
  const { q, items } = data;
  const back = `/members/sales-quotes/${q.id}`;
  const locked = ["signed", "paid"].includes(q.status);

  if (action === "save") {
    if (locked) { await flash("This quote is signed and can't be changed.", "error"); return go(req, back); }
    await snapshot(String(q.id), m.id, null, "Before edit");
    const pm = field(fd, "payment_mode", 20);
    const sl = field(fd, "service_level", 5);
    const expires = field(fd, "expires", 10);
    await db.begin(async (tx) => {
      await tx`update sales_quotes set title = ${field(fd, "title", 200) || q.title},
        expires_on = ${/^\d{4}-\d{2}-\d{2}$/.test(expires) ? expires : q.expires_on},
        payment_mode = ${isPaymentMode(pm) ? pm : q.payment_mode}, service_level = ${isServiceLevel(sl) ? sl : q.service_level},
        status = case when status = 'expired' and ${expires}::text > current_date::text then 'sent' else status end, updated_at = now() where id = ${q.id}`;
      for (const i of items) {
        const g = (k: string) => fd.get(`${k}_${i.id}`);
        if (g("price") === null) continue;
        const cents = Math.round(Number(String(g("price") ?? "").replace(/[^0-9.]/g, "")) * 100);
        const price = Number.isFinite(cents) && cents >= 0 ? cents : i.unit_cents;
        const costIn = String(g("cost") ?? "").replace(/[^0-9.]/g, "");
        const cost = costIn ? Math.round(Number(costIn) * 100) : null;
        const qty = i.billing === "invoiced" ? 0 : Math.max(0, Math.min(1_000_000, parseInt(String(g("qty") ?? "0"), 10) || 0));
        await tx`update sales_quote_items set unit_cents = ${price}, qty = ${qty}, min_qty = least(min_qty, ${qty}),
          cost_cents = ${g("cost") === null ? i.cost_cents ?? null : cost != null && Number.isFinite(cost) ? cost : null},
          adjustable = ${i.billing === "once" && price > 0}, excluded = ${g("del") === "1"} where id = ${i.id}`;
      }
    });
    await snapshot(String(q.id), m.id, null, "Edited by the CPP member");
    await flash("Quote saved.");
    return go(req, back);
  }

  if (action === "send") {
    if (locked) return go(req, back);
    try {
      await sendQuote(String(q.id), { id: m.id, name: m.name });
      await flash("Quote sent. Your client got an email with the link, and you'll get an email each time they open it.");
    } catch (e) { await flash(e instanceof Error ? e.message : "The quote didn't send.", "error"); }
    return go(req, back);
  }

  if (action === "delete") {
    if (q.status !== "draft") { await flash("Only drafts can be deleted.", "error"); return go(req, back); }
    await db`delete from sales_quotes where id = ${q.id} and member_id = ${m.id} and status = 'draft'`;
    await flash("Draft deleted.");
    return go(req, "/members/quotes");
  }
  return go(req, back);
}
