import { NextResponse } from "next/server";
import { deliverLead, saveLead, type Lead } from "@/lib/leads";
import { quickTestCheckout, quickTestCheckoutReady } from "@/lib/commerce";
import { money, quote } from "@/lib/quickTest";
import { getQtPricing } from "@/lib/qtPricing";
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
  if (type === "quick-test" || page.startsWith("/quick-test")) return "individual";
  if (page.startsWith("/laboratories")) return "laboratory";
  if (page.startsWith("/tpas")) return "tpa";
  if (page.startsWith("/treatment-recovery")) return "treatment";
  if (page.startsWith("/drug-testing-businesses") || page.startsWith("/one")) return "drug-testing-business";
  if (body.industry || page.startsWith("/employers") || page.startsWith("/industries")) return "employer";
  return "other";
}

// Extra structured answers from specialized forms (for example Quick Test). Only known keys are kept.
const DETAIL_KEYS = ["topic", "currentProgram", "improve", "costPerTest", "testingLocation", "fulfillment", "clinicZip", "clinicName", "testType", "observation", "reason", "panel", "reportTo", "reportEmail", "address1", "address2", "city", "state", "zip", "deliverBy", "drugs", "kit", "screenFee", "shippingFee", "proctoringFee", "total"] as const;
function detailsOf(v: unknown) {
  if (!v || typeof v !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const k of DETAIL_KEYS) {
    const val = (v as Record<string, unknown>)[k];
    if (typeof val === "string" && val.trim()) out[k] = val.trim().slice(0, k === "currentProgram" ? 2000 : 300);
  }
  return Object.keys(out).length ? out : undefined;
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
    details: detailsOf(body.details),
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
  if (lead.type === "quick-test") {
    const d = lead.details || {};
    const home = d.fulfillment === "At home";
    if (!lead.phone) errors.phone = "Enter a 10 digit phone number.";
    if (d.fulfillment !== "At home" && d.fulfillment !== "At a clinic") errors.fulfillment = "Choose at home or at a clinic.";
    if (!d.testType) errors.testType = "Choose a test type.";
    if (!d.observation) errors.observation = "Choose observed or non-observed.";
    if (!d.reason) errors.reason = "Choose the reason for the test.";
    if (home && (!d.address1 || !d.city || !d.state || !d.zip)) errors.address1 = "Enter the full shipping address.";
    if (!home && !/^\d{5}$/.test(d.clinicZip || "")) errors.clinicZip = "Enter a 5 digit ZIP code.";
    // Price and kit are always recalculated here from the drugs chosen; the browser's total is ignored.
    const custom = Array.isArray((body.details as Record<string, unknown>)?.customDrugs)
      ? ((body.details as Record<string, unknown>).customDrugs as unknown[]).map((x) => String(x).slice(0, 10)).slice(0, 40)
      : [];
    const q = quote(d.testType, d.panel, custom, d.observation, await getQtPricing());
    if (q.error) errors.panel = q.error;
    lead.details = {
      ...d,
      drugs: q.drugs.join(", ") || "Labb to recommend",
      kit: q.kit ? q.kit.code : "Labb to recommend",
      screenFee: money(q.fees.screen),
      shippingFee: money(q.fees.shipping),
      proctoringFee: money(q.fees.proctoring),
      total: money(q.cents),
    };
  }
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  // Quick Test: save the order, then send the buyer to Stripe Checkout. The notification goes out
  // when Stripe confirms payment (webhook). Without Stripe it falls back to an order request.
  if (lead.type === "quick-test" && quickTestCheckoutReady()) {
    try {
      const id = await saveLead(lead);
      const url = await quickTestCheckout(id, lead);
      return NextResponse.json({ ok: true, checkout: url });
    } catch (e) {
      console.error("[quick-test] checkout failed", e);
      return NextResponse.json({ error: "We couldn't start checkout. Please call (877) 868-9967." }, { status: 502 });
    }
  }

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
