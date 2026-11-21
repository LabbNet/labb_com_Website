import { NextResponse } from "next/server";
import { dispatchDue } from "@/lib/social";

// For a scheduler (Render cron job, Zapier schedule or uptime monitor): sends scheduled article posts that are due.
// Call with ?key=CRON_SECRET or the header x-cron-key.
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") || req.headers.get("x-cron-key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return new NextResponse("Not found", { status: 404 });
  const n = await dispatchDue(true);
  return NextResponse.json({ ok: true, processed: n });
}
