import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { listCourses } from "@/lib/courses";

export const metadata: Metadata = { title: "Learners", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
const SOURCE: Record<string, string> = { purchase: "Purchased", cpp: "CPP member", admin: "Added by Labb" };

export default async function Learners({ searchParams }: { searchParams: Promise<{ course?: string; q?: string }> }) {
  await requireAdmin("/admin/learners");
  const sp = await searchParams;
  const courses = await listCourses();
  const bySlug = new Map(courses.map((c) => [c.slug, c]));
  const enrollable = courses.filter((c) => c.hasFile);
  const course = bySlug.get(sp.course || "")?.slug ?? "";
  const q = (sp.q || "").toLowerCase().slice(0, 80);
  const [rows, flash] = await Promise.all([
    sql()<{ id: string; course: string; source: string; chapters_done: number; started_at: Date | null; completed_at: Date | null; cert_id: string | null; created_at: Date; updated_at: Date; amount_cents: number | null; name: string; email: string; clinic: string | null; role: string; status: string }[]>`
      select e.id, e.course, e.source, e.chapters_done, e.started_at, e.completed_at, e.cert_id, e.created_at, e.updated_at, e.amount_cents,
        m.name, m.email, m.clinic, m.role, m.status
      from course_enrollments e join members m on m.id = e.member_id
      where (${course} = '' or e.course = ${course})
        and (${q} = '' or lower(m.name) like ${"%" + q + "%"} or lower(m.email) like ${"%" + q + "%"} or lower(coalesce(m.clinic, '')) like ${"%" + q + "%"})
      order by e.created_at desc`,
    readFlash(),
  ]);
  const done = rows.filter((r) => r.completed_at).length;
  const active = rows.filter((r) => !r.completed_at && r.chapters_done > 0).length;
  const revenue = rows.reduce((t, r) => t + (r.amount_cents ?? 0), 0);

  return (
    <>
      <AdminBar title="Course learners" current="/admin/learners" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <div className="members-top">
            <div className="stats">
              <div><strong>{rows.length}</strong><span>Enrolled</span></div>
              <div><strong>{active}</strong><span>In progress</span></div>
              <div><strong>{done}</strong><span>Completed</span></div>
              <div><strong>{(revenue / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</strong><span>Paid online</span></div>
            </div>
            <details className="hero-card add-member">
              <summary className="btn btn-primary">+ Enroll a learner</summary>
              <p className="form-sub" style={{ marginTop: 14 }}>For invoiced or comped enrollments. Creates a learner account if needed and emails a setup link. CPP members don&apos;t need this; the course is in their member area.</p>
              <form action="/api/admin/learners" method="post" autoComplete="off">
                <div className="fields add-member-fields">
                  <div className="field"><label htmlFor="l-name">Full name</label><input id="l-name" name="name" required maxLength={120} /></div>
                  <div className="field"><label htmlFor="l-email">Email</label><input id="l-email" name="email" type="email" required maxLength={160} /></div>
                  <div className="field"><label htmlFor="l-course">Course</label><select id="l-course" name="course">{enrollable.map((c) => <option key={c.slug} value={c.slug}>{c.title}{c.status === "live" ? "" : c.status === "draft" ? " (draft)" : " (coming soon)"}</option>)}</select></div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 18 }} type="submit">Enroll and send invite</button>
              </form>
            </details>
          </div>
          <form method="get" className="admin-search">
            <input name="q" defaultValue={sp.q || ""} placeholder="Search name, email or clinic" aria-label="Search learners" />
            <select name="course" defaultValue={course} aria-label="Course"><option value="">All courses</option>{enrollable.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select>
            <button className="btn btn-outline-dark" type="submit">Filter</button>
          </form>
          <div className="compare-wrap">
            <table className="compare admin-table">
              <thead><tr><th scope="col" style={{ textAlign: "left" }}>Learner</th><th scope="col">Course</th><th scope="col">How</th><th scope="col">Progress</th><th scope="col">Last activity</th><th scope="col">Certificate</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const c = bySlug.get(r.course);
                  return (
                    <tr key={r.id}>
                      <th scope="row">{r.name}{r.clinic ? <span className="clinic"> · {r.clinic}</span> : null}<span className="sub">{r.email}{r.status === "invited" ? " · account not set up" : ""}</span></th>
                      <td>{c?.short ?? r.course}</td>
                      <td>{SOURCE[r.source] ?? r.source}</td>
                      <td>{r.completed_at ? <span className="status s-active">Complete</span> : <span className="inline-sub">{r.chapters_done} of {c?.chapters ?? "?"} chapters</span>}</td>
                      <td>{r.started_at ? fmt(r.updated_at) : "Not started"}</td>
                      <td>{r.completed_at ? <>{fmt(r.completed_at)}{r.cert_id ? <span className="sub">{r.cert_id}</span> : null}</> : ""}</td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={6}>No learners yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
