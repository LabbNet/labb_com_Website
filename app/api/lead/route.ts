import { NextResponse } from "next/server";
import { deliverLead, type Lead } from "@/lib/leads";
import { isSegment, PRODUCTS, type Segment } from "@/lib/segments";
import { getResource } from "@/lib/resources";
import { COOKIE, cookieOptions, sign, verify } from "@/lib/session";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Segment from the form, or inferred from the form type and page when the form doesn't ask.
function segmentOf(body: Record<string, unknown>): Segment {
  if (isSegment(body.segment)) return body.segment;
  const type = String(body.type || "");
  const page = String(body.page || "");
  if (type === "clinic" || type === "cpp-application" || page.startsWith("/collection-sites")) return "collection-site";
  if (page.startsWith("/corrections") || page.startsWith("/labbpo")) return "corrections";
  if (page.startsWith("/drug-testing-businesses") || page.startsWith("/one")) return "drug-testing-business";
  if (body.industry || page.startsWith("/employers") || page.startsWith("/industries")) return "employer";
  return "other";
}

function productsOf(v: unknown) {
  const list = Array.isArray(v) ? v : typeof v === "string" && v ? v.split(",") : [];
  return list.map((p) => String(p).trim()).filter((p) => (PRODUCTS as readonly string[]).includes(p)).join(", ");
}

// Basic per-instance rate limit. Use a shared store (Upstash, Vercel KV) for multi-region.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 8;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot and timing trap: bots fill hidden fields and submit instantly.
  if (str(body.website) || Number(body.elapsed) < 2500) {
    return NextResponse.json({ ok: true });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return NextResponse.json({ error: "Too many requests. Please call (877) 868-9967." }, { status: 429 });

  const lead: Lead = {
    type: str(body.type, 40) || "contact",
    segment: segmentOf(body),
    products: productsOf(body.products),
    firstName: str(body.firstName, 80),
    lastName: str(body.lastName, 80),
    email: str(body.email, 160).toLowerCase(),
    phone: str(body.phone, 40),
    company: str(body.company, 160),
    city: str(body.city, 80),
    state: str(body.state, 80),
    industry: str(body.industry, 80),
    volume: str(body.volume, 80),
    interest: str(body.interest, 80),
    message: str(body.message, 3000),
    resource: str(body.resource, 120),
    legalName: str(body.legalName, 160),
    signer: str(body.signer, 160),
    services: str(body.services, 400),
    affiliation: str(body.affiliation, 160),
    clinicType: str(body.clinicType, 120),
    wantsAgreement: body.wantsAgreement === true,
    newsletter: body.newsletter === true,
    page: str(body.page, 300),
    referrer: str(body.referrer, 300),
    utm: typeof body.utm === "object" && body.utm ? Object.fromEntries(Object.entries(body.utm as Record<string, unknown>).slice(0, 6).map(([k, v]) => [k.slice(0, 30), str(v, 120)])) : undefined,
    submittedAt: new Date().toISOString(),
    ip,
  };

  const errors: Record<string, string> = {};
  if (lead.type !== "newsletter" && !lead.firstName) errors.firstName = "Enter your first name.";
  if (lead.type !== "newsletter" && !lead.lastName) errors.lastName = "Enter your last name.";
  if (!EMAIL.test(lead.email)) errors.email = "Enter a valid email address, like name@company.com.";
  if (lead.type !== "certification-waitlist" && lead.phone && lead.phone.replace(/\D/g, "").length < 10)
    errors.phone = "Enter a 10 digit phone number.";
  if (lead.type === "cpp-application") {
    if (!lead.company) errors.company = "Enter your clinic or business name.";
    if (!lead.legalName) errors.legalName = "Enter the legal business name for the agreement.";
    if (!lead.city) errors.city = "Enter your city.";
    if (!lead.state) errors.state = "Enter your state.";
    if (!lead.phone) errors.phone = "Enter a 10 digit phone number.";
  }
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  const resource = lead.resource ? getResource(lead.resource) : undefined;
  if (resource) lead.resource = resource.title;

  try {
    await deliverLead(lead);
  } catch (e) {
    console.error("[lead] delivery failed", e);
    return NextResponse.json(
      { error: "We couldn't send your request. Please call (877) 868-9967 or email info@labb.com." },
      { status: 502 },
    );
  }

  const res = NextResponse.json({ ok: true, download: resource?.fileUrl });
  const existing = await verify(req.headers.get("cookie")?.match(new RegExp(`${COOKIE}=([^;]+)`))?.[1]);
  res.cookies.set(COOKIE, await sign({ ...existing, email: lead.email, lead: true }), cookieOptions);
  return res;
}
