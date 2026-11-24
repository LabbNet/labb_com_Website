import { currentMember } from "@/lib/auth";
import { liveData } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// Live visitor numbers for Admin -> Analytics (polled every 15 seconds).
export async function GET() {
  const me = await currentMember();
  if (!me || me.role !== "admin") return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json(await liveData(), { headers: { "Cache-Control": "no-store" } });
}
