import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { SendPanel } from "@/components/SendPanel";
import { absoluteUrl } from "@/lib/site";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { toEasternInput } from "@/lib/imageSize";
import { channelLabel, CHANNELS, defaultMessage, dispatchDue, socialConfigured } from "@/lib/social";

export const metadata: Metadata = { title: "Edit article", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Row = { id: string; slug: string; title: string; description: string; body: string; cover_type: string | null; cover_url: string | null; image_alt: string | null; author: string; status: string; publish_at: Date | null; updated_at: Date };

export default async function ArticleEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin(`/admin/articles/${id}`);
  if (id !== "new" && !/^\d{1,18}$/.test(id)) notFound();
  await dispatchDue();
  const db = sql();
  const [a] = id === "new" ? [undefined] : await db<Row[]>`select id, slug, title, description, body, cover_type, cover_url, image_alt, author, status, publish_at, updated_at from articles where id = ${id}`;
  if (id !== "new" && !a) notFound();
  const [posts, flash] = await Promise.all([
    a ? db<{ id: string; channels: string[]; status: string; scheduled_at: Date; sent_at: Date | null; result: Record<string, string> | null; by: string | null }[]>`
      select p.id, p.channels, p.status, p.scheduled_at, p.sent_at, p.result, m.name as by from article_posts p left join members m on m.id = p.created_by
      where p.article_id = ${a.id} order by p.scheduled_at desc` : Promise.resolve([]),
    readFlash(),
  ]);
  const live = !!a && a.status === "published" && !!a.publish_at && a.publish_at.getTime() <= Date.now();
  const scheduled = !!a && a.status === "published" && !!a.publish_at && a.publish_at.getTime() > Date.now();

  return (
    <>
      <AdminBar title={a ? "Edit article" : "New article"} current="/admin/articles" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <p style={{ marginTop: 0 }}><Link href="/admin/articles">← All articles</Link></p>
          <Flash flash={flash} />
          <div className="article-editor">
            <form action="/api/admin/articles" method="post" encType="multipart/form-data" className="hero-card">
              <input type="hidden" name="action" value="save" />
              {a && <input type="hidden" name="id" value={a.id} />}
              <div className="fields" style={{ gridTemplateColumns: "1fr" }}>
                <div className="field"><label htmlFor="ar-t">Title<span className="req">*</span></label><input id="ar-t" name="title" required maxLength={200} defaultValue={a?.title} /></div>
                <div className="field"><label htmlFor="ar-d">Summary<span className="req">*</span></label><textarea id="ar-d" name="description" required maxLength={300} rows={2} defaultValue={a?.description} placeholder="One or two sentences. Used on News, in search results and as the default social post." /></div>
                <div className="field"><label htmlFor="ar-au">Author</label><input id="ar-au" name="author" maxLength={80} defaultValue={a?.author ?? admin.name} /></div>
                <div className="field">
                  <label htmlFor="ar-c">Cover image {a?.cover_type ? "(leave empty to keep the current one)" : ""}</label>
                  <input id="ar-c" name="cover" type="file" accept="image/jpeg,image/png,image/webp" />
                  <span className="fine" style={{ textAlign: "left" }}>JPG, PNG or WebP under 8 MB. 1200 x 675 or larger works on every platform. Instagram needs an image.</span>
                </div>
                {a?.cover_type ? <img src={`/api/articles/${a.id}/cover?v=${a.updated_at.getTime()}`} alt="" className="article-cover-preview" /> : a?.cover_url ? <img src={a.cover_url} alt="" className="article-cover-preview" /> : null}
                <div className="field"><label htmlFor="ar-alt">Image description (for accessibility)</label><input id="ar-alt" name="image_alt" maxLength={200} defaultValue={a?.image_alt ?? ""} /></div>
                <div className="field">
                  <label htmlFor="ar-b">Article<span className="req">*</span></label>
                  <textarea id="ar-b" name="body" required rows={20} defaultValue={a?.body} className="article-body-input" />
                  <span className="fine" style={{ textAlign: "left" }}>
                    Leave a blank line between paragraphs. ## Heading · ### Subheading · - bullet · 1. numbered · **bold** · *italic* · [link text](https://...) · &gt; quote
                  </span>
                </div>
                <fieldset className="field publish-choice">
                  <legend>Publishing</legend>
                  {a && <label><input type="radio" name="publish" value="keep" defaultChecked /> Keep as is ({live ? "live" : scheduled ? `scheduled for ${fmtDate(a.publish_at!)} ET` : "draft"})</label>}
                  <label><input type="radio" name="publish" value="draft" defaultChecked={!a} /> Save as draft</label>
                  <label><input type="radio" name="publish" value="now" /> Publish now</label>
                  <label><input type="radio" name="publish" value="schedule" /> Release on <input type="datetime-local" name="publish_at" defaultValue={toEasternInput(scheduled ? a!.publish_at : null)} aria-label="Release date and time, Eastern" /> <span className="fine">Eastern time</span></label>
                </fieldset>
              </div>
              <div className="btn-row" style={{ marginTop: 16 }}>
                <button className="btn btn-primary" type="submit">Save</button>
                {a && <a className="btn btn-outline-dark" href={`/news/${a.slug}`} target="_blank" rel="noopener">{live ? "View on News" : "Preview"}</a>}
              </div>
            </form>

            <div className="article-side">
              <div className="hero-card">
                <h2 className="form-title">Share</h2>
                {!a ? <p className="form-sub">Save the article first, then choose where to send it.</p> : (
                  <SendPanel id={a.id} channels={CHANNELS.map((c) => ({ id: c.id, label: c.label }))} defaultMessage={defaultMessage(a)} live={live} socialReady={socialConfigured()} hasImage={Boolean(a.cover_type || a.cover_url?.startsWith("/"))} articleUrl={absoluteUrl(`/news/${a.slug}`)} />
                )}
              </div>
              {posts.length > 0 && (
                <div className="hero-card" style={{ marginTop: 20 }}>
                  <h2 className="form-title">Send history</h2>
                  <ul className="contract-list">
                    {posts.map((p) => (
                      <li key={p.id}>
                        <div>
                          <strong>{p.status === "queued" ? `Scheduled ${fmtDate(p.scheduled_at)} ET` : p.status === "canceled" ? "Canceled" : `${p.status === "sent" ? "Sent" : p.status === "partial" ? "Partly sent" : p.status === "failed" ? "Failed" : "Sending"} ${p.sent_at ? fmtDate(p.sent_at) : ""}`}</strong>
                          <span className="sub">{p.channels.map(channelLabel).join(", ")}{p.by ? ` · by ${p.by}` : ""}</span>
                          {p.result && <span className="sub">{Object.entries(p.result).map(([k, v]) => `${channelLabel(k)}: ${v}`).join(" · ")}</span>}
                        </div>
                        {p.status === "queued" && (
                          <form action="/api/admin/articles" method="post">
                            <input type="hidden" name="action" value="cancel-post" />
                            <input type="hidden" name="id" value={a!.id} />
                            <input type="hidden" name="pid" value={p.id} />
                            <button className="linkish danger" type="submit">Cancel</button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {a && (
                <div className="article-danger">
                  {a.status === "published" && (
                    <form action="/api/admin/articles" method="post"><input type="hidden" name="action" value="unpublish" /><input type="hidden" name="id" value={a.id} /><button className="linkish" type="submit">Unpublish</button></form>
                  )}
                  <form action="/api/admin/articles" method="post"><input type="hidden" name="action" value="delete" /><input type="hidden" name="id" value={a.id} /><button className="linkish danger" type="submit">Delete article</button></form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
