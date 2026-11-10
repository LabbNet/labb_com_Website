import { NextResponse } from "next/server";
import { deliverLead, type Lead } from "@/lib/leads";
import { getResource } from "@/lib/resources";
import { COOKIE, cookieOptions, sign, verify } from "@/lib/session";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
    firstName: str(body.firstName, 80),
    lastName: str(body.lastName, 80),
    email: str(body.email, 160).toLowerCase(),
    phone: str(body.phone, 40),
    company: str(body.company, 160),
    city: str(body.city, 80),
    state: str(body.state, 80),
    audience: str(body.audience, 80),
    industry: str(body.industry, 80),
    volume: str(body.volume, 80),
    interest: str(body.interest, 80),
    message: str(body.message, 3000),
    resource: str(body.resource, 120),
    newsletter: body.newsletter === true,
    page: str(body.page, 300),
    referrer: str(body.referrer, 300),
    utm: typeof body.utm === "object" && body.utm ? Object.fromEntries(Object.entries(body.utm as Record<string, unknown>).slice(0, 6).map(([k, v]) => [k.slice(0, 30), str(v, 120)])) : undefined,
    submittedAt: new Date().toISOString(),
    ip,
  };

  const errors: Record<string, string> = {};
  if (!lead.firstName) errors.firstName = "Enter your first name.";
  if (!lead.lastName) errors.lastName = "Enter your last name.";
  if (!EMAIL.test(lead.email)) errors.email = "Enter a valid email address, like name@company.com.";
  if (lead.type !== "certification-waitlist" && lead.phone && lead.phone.replace(/\D/g, "").length < 10)
    errors.phone = "Enter a 10 digit phone number.";
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
