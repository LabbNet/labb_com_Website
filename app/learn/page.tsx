import Link from "next/link";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { courseAccess, listCourses, type Course, type Enrollment } from "@/lib/courses";

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

// A learner's courses: enrolled ones, plus courses included with the CPP for members.
export default async function MyCourses() {
  const m = (await currentMember())!;
  const rows = await sql()<Enrollment[]>`select * from course_enrollments where member_id = ${m.id}`;
  const list: { c: Course; e: Enrollment | null }[] = [];
  for (const c of await listCourses()) {
    if (!c.hasFile) continue;
    const e = rows.find((r) => r.course === c.slug) ?? (c.cppIncluded && c.status === "live" && m.role !== "learner" ? await courseAccess(m, c) : null);
    if (e) list.push({ c, e });
  }
  return (
    <section className="section" style={{ paddingTop: 36 }}>
      <div className="wrap">
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)" }}>My courses</h1>
        <p className="lede">Your progress saves to your account as you go, so you can stop and pick up where you left off on any device.</p>
        {!list.length && (
          <p className="hero-card">You aren&apos;t enrolled in a course yet. <Link href="/certifications">See the certification courses</Link>.</p>
        )}
        <div className="course-list">
          {list.map(({ c, e }) => {
            const pct = Math.round(((e?.chapters_done ?? 0) / Math.max(1, c.chapters)) * 100);
            return (
              <div key={c.slug} className="course-card">
                <div>
                  <span className="eyebrow">{c.short}</span>
                  <h2>{c.title}</h2>
                  <p className="fine">
                    {e?.completed_at ? `Completed ${fmt(e.completed_at)}${e.cert_id ? ` · Certificate ${e.cert_id}` : ""}` : `${e?.chapters_done ?? 0} of ${c.chapters} chapters passed`}
                  </p>
                  <div className="course-bar" aria-label={`${pct}% complete`}><i style={{ width: `${pct}%` }} /></div>
                </div>
                <a className="btn btn-primary" href={`/learn/${c.slug}/play`}>{e?.completed_at ? "Open course and certificate" : e?.chapters_done || e?.started_at ? "Continue" : "Start course"}</a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
