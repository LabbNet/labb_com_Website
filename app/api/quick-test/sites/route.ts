import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clientIp, RateLimiter } from "@/lib/http";
import { knownZip, nearbySites } from "@/lib/collectionSites";

// GET ?zip=12345 -> collection sites near that ZIP for a Quick Test at a clinic.
const limiter = new RateLimiter(30, 10 * 60_000);

export async function GET(req: Request) {
  const ip = clientIp(await headers());
  if (limiter.blocked(ip)) return NextResponse.json({ error: "Too many searches. Try again in a few minutes." }, { status: 429 });
  limiter.record(ip);
  const zip = (new URL(req.url).searchParams.get("zip") || "").trim().slice(0, 5);
  if (!/^\d{5}$/.test(zip)) return NextResponse.json({ error: "Enter a 5 digit ZIP code." }, { status: 400 });
  if (!knownZip(zip)) return NextResponse.json({ error: "We couldn't find that ZIP code." }, { status: 404 });
  const sites = await nearbySites(zip);
  return NextResponse.json({ sites }, { headers: { "Cache-Control": "no-store" } });
}
