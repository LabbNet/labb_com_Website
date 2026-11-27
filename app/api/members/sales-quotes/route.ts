import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { logLeadEvent, type LeadRow } from "@/lib/leads";
import { isSegment } from "@/lib/segments";
import {
  cppCanQuote, createQuote, getQuote, isPaymentMode, isServiceLevel, partnerReprice, sendQuote, snapshot, syncCatalogLines,
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
    let leadId = field(fd, "lead", 20).replace(/\D/g, "");
    if (field(fd, "lead", 20) === "new") {
      // A new client company: added to the member's leads, then quoted.
      const company = field(fd, "company", 160), first = field(fd, "first_name", 80), last = field(fd, "last_name", 80);
      const email = field(fd, "email", 200).toLowerCase(), phone = field(fd, "phone", 30);
      const segment = field(fd, "segment", 40);
      if (!company || !first || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { await flash("Enter the company, a contact name and a valid email.", "error"); return go(req, "/members/quotes"); }
      if (!isSegment(segment) || !cppCanQuote(segment)) { await flash("CPP members quote employers, treatment centers and corrections agencies. Choose one of those.", "error"); return go(req, "/members/quotes"); }
      const [row] = await db<{ id: string }[]>`insert into leads (type, segment, first_name, last_name, email, phone, company, page, data, owner, partner_id, passed_at, passed_by)
        values ('partner-added', ${segment}, ${first}, ${last || null}, ${email}, ${phone || null}, ${company}, '/members/quotes', ${db.json({ addedBy: m.name, via: "quote" })}, 'partner', ${m.id}, now(), ${m.id}) returning id::text`;
      await logLeadEvent(row.id, "received", `Added by CPP member ${m.name} to send a quote`, { id: m.id, name: m.name });
      leadId = row.id;
    }
    const [lead] = leadId ? await db<LeadRow[]>`select * from leads where id = ${leadId} and partner_id = ${m.id} and owner = 'partner'` : [];
    if (!lead) { await flash("Pick one of your leads, or add a new client.", "error"); return go(req, "/members/quotes"); }
    // Only Labb quotes clinics and collection sites.
    if (!cppCanQuote(lead.segment)) { await flash("CPP members quote employers, treatment centers and corrections agencies only. Clinics and collection sites are quoted by Labb.", "error"); return go(req, "/members/quotes"); }
    const kind: "employer" | "custom" = field(fd, "kind", 20) === "custom" ? "custom" : "employer";
    const id = await createQuote(lead, kind, null, { id: m.id, name: m.name }, { memberId: m.id });
    await partnerReprice(id);
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
        expires_manual = ${q.expires_manual || (/^\d{4}-\d{2}-\d{2}$/.test(expires) && expires !== new Date(q.expires_on).toISOString().slice(0, 10))},
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
      await sendQuote(String(q.id), { id: m.id, name: m.name }, { subject: field(fd, "subject", 200), message: String(fd.get("message") ?? "").slice(0, 5000) });
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
