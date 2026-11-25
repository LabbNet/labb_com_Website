import { headers } from "next/headers";
import { currentMember, sameOrigin } from "@/lib/auth";
import { stripeEnabled } from "@/lib/commerce";
import { sql } from "@/lib/db";
import { clientIp, field, go } from "@/lib/http";
import { leadName, logLeadEvent } from "@/lib/leads";
import { esc, emailLayout, sendMail } from "@/lib/mail";
import {
  getQuoteByToken, markPaid, money, notifyRep, quoteCheckout, quoteNumber, quoteUrl, recordOpen, setQuantities, signatureHash, totals,
} from "@/lib/salesQuotes";

// A lead's actions on their quote page: open it, change quantities, sign and pay.
export async function POST(req: Request) {
  const isJson = (req.headers.get("content-type") || "").includes("application/json");
  if (!(await sameOrigin())) return isJson ? Response.json({ error: "forbidden" }, { status: 403 }) : go(req, "/");
  if (isJson) {
    const b = (await req.json().catch(() => ({}))) as { token?: string; qty?: Record<string, number> };
    const data = await getQuoteByToken(String(b.token || ""));
    if (!data) return Response.json({ error: "Quote not found." }, { status: 404 });
    const { q, items } = data;
    if (!["sent", "viewed"].includes(q.status) || new Date(q.expires_on) < new Date(new Date().toISOString().slice(0, 10))) return Response.json({ error: "This quote can't be changed." }, { status: 409 });
    const n = await setQuantities(q, items, b.qty || {});
    if (n) await logLeadEvent(q.lead_id, "quote", `Changed quantities on quote ${quoteNumber(q)}`, null);
    return Response.json({ ok: true, changed: n });
  }

  const fd = await req.formData();
  const token = field(fd, "token", 80);
  const data = await getQuoteByToken(token);
  if (!data) return go(req, "/");
  const { q, items, lead } = data;
  const page = `/quote/${token}`;
  const action = field(fd, "action", 20);
  const me = await currentMember();
  const staff = me?.role === "admin";
  const expired = new Date(q.expires_on) < new Date(new Date().toISOString().slice(0, 10));

  if (action === "open") {
    if (!staff && q.status !== "draft") await recordOpen(q, lead);
    return go(req, `${page}?open=1`);
  }

  if (action === "accept") {
    if (!["sent", "viewed"].includes(q.status) || expired) return go(req, `${page}?open=1&e=closed`);
    const name = field(fd, "name", 120);
    const title = field(fd, "title", 120);
    const sig = String(fd.get("signature") ?? "");
    if (name.length < 3 || fd.get("agree") !== "1" || fd.get("esign") !== "1") return go(req, `${page}?open=1&e=sign#accept`);
    const png = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(sig) && sig.length < 300_000 ? sig : null;
    const h = await headers();
    const t = totals(items);
    if (t.dueToday === 0 && !items.some((i) => i.billing === "invoiced")) return go(req, `${page}?open=1&e=empty#accept`);
    await sql()`update sales_quotes set status = 'signed', signed_at = now(), signed_name = ${name}, signed_title = ${title || null}, signature_png = ${png},
      signed_ip = ${clientIp(h)}, signed_agent = ${(h.get("user-agent") || "").slice(0, 300)}, signed_hash = ${signatureHash(q, items)}, updated_at = now()
      where id = ${q.id} and status in ('sent', 'viewed')`;
    await logLeadEvent(q.lead_id, "quote", `Signed quote ${quoteNumber(q)} as ${name}${title ? `, ${title}` : ""} (due at acceptance ${money(t.dueToday)})`, null);
    await notifyRep(q, lead, `Quote ${quoteNumber(q)} signed`, `<p><strong>${esc(leadName(lead))}</strong>${lead.company ? `, ${esc(lead.company)}` : ""} signed <strong>${esc(q.title)}</strong> as ${esc(name)}${title ? `, ${esc(title)}` : ""}.</p><p>Due at acceptance: <strong>${money(t.dueToday)}</strong>. ${t.dueToday ? "They're being sent to checkout now." : "Nothing is due today."}</p>`);
    if (t.dueToday === 0) { await markPaid(String(q.id), 0, null); return go(req, `${page}?paid=1`); }
    if (!stripeEnabled) {
      await sendMail(lead.email, `Quote signed: ${q.title}`, emailLayout("Thank you for signing", `<p>Hi ${esc(lead.first_name || "there")},</p><p>We received your signed quote ${quoteNumber(q)}. Your Labb rep will send an invoice for ${money(t.dueToday)} to finalize your order.</p>`, { href: quoteUrl(q.token), label: "View your quote" }), `We received your signed quote ${quoteNumber(q)}. Your Labb rep will send an invoice for ${money(t.dueToday)}.`);
      return go(req, `${page}?signed=1`);
    }
    try { return Response.redirect(await quoteCheckout(q, items, lead), 303); } catch (e) { console.error("[quote] checkout", e); return go(req, `${page}?signed=1&e=pay`); }
  }

  if (action === "pay") {
    if (q.status !== "signed" || !stripeEnabled) return go(req, `${page}?open=1`);
    try { return Response.redirect(await quoteCheckout(q, items, lead), 303); } catch (e) { console.error("[quote] checkout", e); return go(req, `${page}?signed=1&e=pay`); }
  }
  return go(req, page);
}
