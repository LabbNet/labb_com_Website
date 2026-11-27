import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { GUIDEBOOKS, GUIDEBOOKS_LIVE, LATEST_NOTE, type Audience } from "@/lib/guidebooks";
import { clientIp, RateLimiter } from "@/lib/http";
import { deliverLead, type Lead } from "@/lib/leads";
import { emailLayout, esc, sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";

const limit = new RateLimiter(8, 60 * 60_000);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

// The guidebooks form: save the lead, then email a link to a labb.com page with the guidebooks they chose.
export async function POST(req: Request) {
  if (!GUIDEBOOKS_LIVE && (await currentMember())?.role !== "admin") return NextResponse.json({ error: "Not available yet." }, { status: 404 });
  const ip = clientIp(req.headers);
  if (limit.blocked(ip)) return NextResponse.json({ error: "Too many requests. Please call (877) 868-9967." }, { status: 429 });
  limit.record(ip);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (str(b.website, 100)) return NextResponse.json({ ok: true }); // honeypot
  const audience: Audience = b.audience === "clinic" ? "clinic" : "employer";
  const slugs = (Array.isArray(b.guidebooks) ? b.guidebooks : []).map((s) => String(s)).filter((s) => GUIDEBOOKS.some((g) => g.slug === s && g.for.includes(audience)));
  const v = { first: str(b.firstName, 80), last: str(b.lastName, 80), email: str(b.email, 160).toLowerCase(), company: str(b.company, 160), phone: str(b.phone, 40), state: str(b.state, 40) };
  const errors: Record<string, string> = {};
  if (!slugs.length) errors.guidebooks = "Choose at least one guidebook.";
  if (!v.first) errors.firstName = "Enter your first name.";
  if (!v.last) errors.lastName = "Enter your last name.";
  if (!EMAIL.test(v.email)) errors.email = "Enter a valid email address.";
  if (!v.company) errors.company = audience === "clinic" ? "Enter your clinic name." : "Enter your company name.";
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  const books = GUIDEBOOKS.filter((g) => slugs.includes(g.slug));
  const lead: Lead = {
    type: "handbook", segment: audience === "clinic" ? "collection-site" : "employer",
    firstName: v.first, lastName: v.last, email: v.email, phone: v.phone, company: v.company, state: v.state,
    resource: books.map((g) => g.title).join(", ").slice(0, 120), page: "/guidebooks", submittedAt: new Date().toISOString(), ip,
  } as Lead;
  let leadId: string | null = null;
  try { leadId = (await deliverLead(lead)).id ?? null; } catch (e) { console.error("[guidebooks] lead", e); }
  const token = randomBytes(18).toString("base64url");
  await sql()`insert into guidebook_access (token, lead_id, email, audience, slugs) values (${token}, ${leadId}, ${v.email}, ${audience}, ${slugs})`;
  const link = absoluteUrl(`/guidebooks/view/${token}`);
  const list = books.map((g) => `<li>${esc(g.title)}</li>`).join("");
  const sent = await sendMail(v.email, books.length === 1 ? `Your Labb guidebook: ${books[0].title}` : "Your Labb guidebooks",
    emailLayout("Your guidebooks are ready", `<p>Hi ${esc(v.first)},</p><p>Thanks for your interest. Here ${books.length === 1 ? "is the guidebook" : "are the guidebooks"} you asked for:</p><ul>${list}</ul><p>Open them on labb.com with the button below. Keep this email: the link always opens the current edition.</p><p style="font-size:13px;color:#5f6a74">${esc(LATEST_NOTE)}</p>`, { href: link, label: books.length === 1 ? "Read the guidebook" : "Read your guidebooks" }),
    `Hi ${v.first},\n\nHere ${books.length === 1 ? "is the guidebook" : "are the guidebooks"} you asked for:\n${books.map((g) => `- ${g.title}`).join("\n")}\n\nRead them on labb.com: ${link}\n\n${LATEST_NOTE}\n\nThe Labb team`);
  if (!sent) return NextResponse.json({ error: "We couldn't email your link. Please call (877) 868-9967 or email info@labb.com." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
