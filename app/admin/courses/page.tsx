import type { Metadata } from "next";
import Link from "next/link";
import { AdminBar, Flash } from "@/components/AdminBar";
import { readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { COURSE_TYPES, listCourses } from "@/lib/courses";

export const metadata: Metadata = { title: "Courses", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  live: { label: "Live", cls: "s-active" },
  coming: { label: "Coming soon", cls: "s-invited" },
  draft: { label: "Draft", cls: "s-disabled" },
};
const money = (c: number | null) => (c === null ? "No price" : `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0 })}`);

export default async function Courses() {
  await requireAdmin("/admin/courses");
  const [courses, counts, flash] = await Promise.all([
    listCourses(),
    sql()<{ course: string; n: number; done: number }[]>`select course, count(*)::int as n, count(completed_at)::int as done from course_enrollments group by course`,
    readFlash(),
  ]);
  const cnt = new Map(counts.map((r) => [r.course, r]));

  return (
    <>
      <AdminBar title="Courses" current="/admin/courses" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <p className="intro" style={{ marginBottom: 20 }}>
            Set each course&apos;s name, overview, price, pages, CPP access and status. <strong>Live</strong> courses are listed and for sale,
            <strong> Coming soon</strong> courses are listed without a price, and <strong>Drafts</strong> are hidden (you can still preview them).
            Chapters, questions and the pass mark are built into each course file.
          </p>
          <div className="admin-courses">
            {courses.map((c) => {
              const s = STATUS[c.status];
              const e = cnt.get(c.slug);
              return (
                <details key={c.slug} id={c.slug} className="ac-item">
                  <summary>
                    <div className="ac-name">
                      <span className="ci-type">{COURSE_TYPES[c.type]}</span>
                      <strong>{c.short}</strong>
                      <span className="sub">{c.title}{c.version ? ` · v${c.version}` : ""}</span>
                    </div>
                    <span className={`status ${s.cls}`}>{s.label}</span>
                    <span className="ac-price">{money(c.priceCents)}</span>
                    <span className="ac-facts">
                      {c.hasFile ? <>{c.chapters} chapters · {c.questions} questions · {c.passPct}% to pass{c.pages ? ` · ${c.pages} pages` : ""}</> : <em>No course file yet</em>}
                    </span>
                    <span className="ac-facts">{e ? `${e.n} enrolled · ${e.done} done` : "0 enrolled"}{c.cppIncluded ? " · CPP free" : c.cppDiscountPct ? ` · CPP ${c.cppDiscountPct}% off` : ""}</span>
                    <span className="ac-edit" aria-hidden="true">Edit</span>
                  </summary>
                  <form action="/api/admin/courses" method="post" className="ac-form">
                    <input type="hidden" name="slug" value={c.slug} />
                    <div className="fields">
                      <div className="field"><label htmlFor={`t-${c.slug}`}>Course name</label><input id={`t-${c.slug}`} name="title" defaultValue={c.title} required maxLength={160} /></div>
                      <div className="field"><label htmlFor={`s-${c.slug}`}>Short name (catalog)</label><input id={`s-${c.slug}`} name="short" defaultValue={c.short} required maxLength={80} /></div>
                      <div className="field"><label htmlFor={`p-${c.slug}`}>Price (USD)</label><input id={`p-${c.slug}`} name="price" inputMode="decimal" defaultValue={c.priceCents === null ? "" : (c.priceCents / 100).toFixed(c.priceCents % 100 ? 2 : 0)} placeholder="199" maxLength={12} /></div>
                      <div className="field"><label htmlFor={`g-${c.slug}`}>Pages of material</label><input id={`g-${c.slug}`} name="pages" inputMode="numeric" defaultValue={c.pages ?? ""} placeholder="Leave blank to hide" maxLength={5} /></div>
                      <div className="field"><label htmlFor={`st-${c.slug}`}>Status</label>
                        <select id={`st-${c.slug}`} name="status" defaultValue={c.status}>
                          <option value="live" disabled={!c.hasFile}>Live (listed, for sale)</option>
                          <option value="coming">Coming soon</option>
                          <option value="draft">Draft (hidden)</option>
                        </select>
                      </div>
                      <div className="field"><label htmlFor={`ty-${c.slug}`}>Type</label>
                        <select id={`ty-${c.slug}`} name="type" defaultValue={c.type}>
                          {Object.entries(COURSE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div className="field full"><label htmlFor={`o-${c.slug}`}>Overview</label><textarea id={`o-${c.slug}`} name="overview" defaultValue={c.overview} required maxLength={600} rows={3} /></div>
                      <div className="field"><label htmlFor={`f-${c.slug}`}>Who it&apos;s for</label><input id={`f-${c.slug}`} name="for_who" defaultValue={c.forWho} maxLength={200} /></div>
                      <div className="field"><label htmlFor={`o2-${c.slug}`}>List order</label><input id={`o2-${c.slug}`} name="sort" inputMode="numeric" defaultValue={c.sort} maxLength={5} /></div>
                      <div className="field"><label htmlFor={`d-${c.slug}`}>CPP member discount (%)</label><input id={`d-${c.slug}`} name="cpp_discount" inputMode="numeric" defaultValue={c.cppDiscountPct} maxLength={3} /></div>
                      <label className="check"><input type="checkbox" name="cpp_included" defaultChecked={c.cppIncluded} /> Included free for active CPP members (overrides the discount)</label>
                    </div>
                    <div className="ac-actions">
                      <button className="btn btn-primary" type="submit">Save</button>
                      {c.status !== "draft" && <Link className="btn btn-outline" href={`/certifications/${c.slug}`} target="_blank">View course page</Link>}
                      {c.hasFile && <a className="btn btn-outline" href={`/learn/${c.slug}/play`} target="_blank" rel="noreferrer">Preview course</a>}
                      <span className="fine">Last saved {new Date(c.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </form>
                </details>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
