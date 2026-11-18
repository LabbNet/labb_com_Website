import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { courseAccess, coursePage, getCourse } from "@/lib/courses";
import { go } from "@/lib/http";

// The course player, served whole (it has its own layout). Only for enrolled learners.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getCourse(slug);
  if (!c || !c.hasFile) return new Response("Not found", { status: 404 });
  const m = await currentMember();
  if (!m) return go(req, `/login?next=${encodeURIComponent(`/learn/${slug}/play`)}`);
  const e = await courseAccess(m, c);
  if (!e) return go(req, `/certifications/${slug}`);
  const [row] = await sql()<{ state: unknown }[]>`select state from course_enrollments where id = ${e.id}`;
  const html = await coursePage(c, row?.state ?? null, { name: m.name, clinic: m.clinic });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
