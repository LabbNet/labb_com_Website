import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { dispatchDue } from "@/lib/social";

export const metadata: Metadata = { title: "Articles", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ArticlesAdmin() {
  await requireAdmin("/admin/articles");
  await dispatchDue();
  const [rows, flash] = await Promise.all([
    sql()<{ id: string; title: string; slug: string; status: string; publish_at: Date | null; updated_at: Date; author: string; posts: number; queued: number }[]>`
      select a.id, a.title, a.slug, a.status, a.publish_at, a.updated_at, a.author,
        (select count(*)::int from article_posts p where p.article_id = a.id and p.status in ('sent', 'partial')) as posts,
        (select count(*)::int from article_posts p where p.article_id = a.id and p.status = 'queued') as queued
      from articles a order by coalesce(a.publish_at, a.updated_at) desc`,
    readFlash(),
  ]);
  const state = (r: (typeof rows)[number]) =>
    r.status !== "published" ? ["Draft", "s-lost"] : r.publish_at && r.publish_at.getTime() > Date.now() ? ["Scheduled", "s-invited"] : ["Live", "s-active"];
  return (
    <>
      <AdminBar title="Articles" current="/admin/articles" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <div className="leads-head">
            <p className="lede" style={{ margin: 0, maxWidth: 760 }}>Write articles for labb.com/news, publish now or schedule a release, then send them to LinkedIn, Facebook, X, Instagram and the newsletter.</p>
            <Link href="/admin/articles/new" className="btn btn-primary">+ New article</Link>
          </div>
          {!rows.length ? <p className="hero-card">No articles yet.</p> : (
            <div className="bg-table-wrap">
              <table className="bg-table">
                <thead><tr><th scope="col">Article</th><th scope="col">Status</th><th scope="col">Release</th><th scope="col">Shared</th></tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const [label, cls] = state(r);
                    return (
                      <tr key={r.id}>
                        <th scope="row"><Link href={`/admin/articles/${r.id}`}>{r.title}</Link><span className="bg-note" style={{ color: "var(--muted)" }}>{r.author} · edited {fmtDate(r.updated_at)}</span></th>
                        <td><span className={`status ${cls}`}>{label}</span></td>
                        <td>{r.publish_at ? fmtDate(r.publish_at) : ""}</td>
                        <td>{r.posts ? `${r.posts} sent` : ""}{r.queued ? `${r.posts ? ", " : ""}${r.queued} scheduled` : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
