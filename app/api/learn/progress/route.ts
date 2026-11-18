import { NextResponse } from "next/server";
import { currentMember, sameOrigin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getCourse, summarize } from "@/lib/courses";

// Saves the course player's progress to the learner's enrollment and records completion.
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await sameOrigin())) return NextResponse.json({ ok: false }, { status: 403 });
  const raw = await req.text();
  if (raw.length > 400_000) return NextResponse.json({ ok: false }, { status: 413 });
  let body: { course?: string; state?: Record<string, unknown> };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const c = getCourse(String(body.course || ""));
  if (!c || !body.state || typeof body.state !== "object") return NextResponse.json({ ok: false }, { status: 400 });
  const s = summarize(c, body.state);
  const rows = await sql()`
    update course_enrollments set state = ${sql().json(body.state as never)}, chapters_done = ${s.done},
      started_at = coalesce(started_at, case when ${s.started} then now() end),
      completed_at = coalesce(completed_at, case when ${s.complete} then ${s.completedAt ?? new Date()}::timestamptz end),
      cert_id = coalesce(cert_id, case when ${s.complete} then ${s.certId} end),
      cert_name = coalesce(cert_name, case when ${s.complete} then ${s.name} end),
      updated_at = now()
    where member_id = ${m.id} and course = ${c.slug} returning id`;
  return NextResponse.json({ ok: rows.length > 0 });
}
