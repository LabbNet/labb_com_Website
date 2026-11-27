import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { slugify } from "@/lib/articleFormat";
import { easternToDate, imageSize } from "@/lib/imageSize";
import { CHANNELS, defaultMessage, dispatchDue, isChannel, runPost } from "@/lib/social";
import { listArticles } from "@/lib/articles";
import { draftArticle, reviseArticle } from "@/lib/articleAi";
import { emailLayout, esc, sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";

const MAX_COVER = 8 * 1024 * 1024;

// Admin: create, edit, publish or schedule articles, and send them to social media and the newsletter.
export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/articles");
  if (!(await sameOrigin())) return go(req, "/admin/articles");
  const fd = await req.formData();
  const action = field(fd, "action", 20);
  const id = field(fd, "id", 20);
  const db = sql();
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");
  const back = (aid?: string) => go(req, aid ? `/admin/articles/${aid}` : "/admin/articles");
  // Only the superadmin (James) publishes. Everyone else's articles wait as drafts for review.
  const [{ superadmin }] = await db<{ superadmin: boolean }[]>`select superadmin from members where id = ${admin.id}`;
  const askReview = async (aid: string, title: string) => {
    const reviewers = await db<{ email: string }[]>`select email from members where superadmin and status <> 'disabled'`;
    for (const r of reviewers) await sendMail(r.email, `Article ready for review: ${title}`,
      emailLayout("An article is waiting for your review", `<p>${esc(admin.name)} saved <strong>${esc(title)}</strong> and asked for it to be published. Review it, edit anything, then publish or schedule it.</p>`, { href: absoluteUrl(`/admin/articles/${aid}`), label: "Review the article" }),
      `${admin.name} asked for ${title} to be published. Review it: ${absoluteUrl(`/admin/articles/${aid}`)}`).catch(() => {});
  };

  if (action === "ai-draft" || action === "ai-revise") {
    try {
      const file = fd.get("cover");
      let cover: { data: Buffer; type: string; w: number; h: number } | null = null;
      if (file instanceof File && file.size) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const dim = file.size <= MAX_COVER ? imageSize(bytes) : null;
        if (!dim) { await flash("The image must be a JPG, PNG or WebP under 8 MB.", "error"); return back(/^\d+$/.test(id) ? id : undefined); }
        cover = { data: Buffer.from(bytes), type: dim.type, w: dim.w, h: dim.h };
      }
      if (action === "ai-revise" && /^\d+$/.test(id)) {
        const [cur] = await db<{ title: string; description: string; body: string; status: string }[]>`select title, description, body, status from articles where id = ${id}`;
        if (!cur) return back();
        const out = await reviseArticle(cur, String(fd.get("instructions") ?? "").slice(0, 2000) || "Tighten the writing.");
        await db`update articles set title = ${out.title}, description = ${out.description || cur.description}, body = ${out.body}, status = 'draft', updated_at = now() where id = ${id}`;
        await flash(`AI revised the article.${cur.status === "published" ? " It was taken off the site and is now a draft until it's published again." : ""} Review it below.`);
        return back(id);
      }
      const topic = field(fd, "topic", 300);
      if (!topic) { await flash("Tell the AI what the article is about.", "error"); return back(); }
      const out = await draftArticle({ topic, audience: field(fd, "audience", 120), notes: String(fd.get("notes") ?? "").slice(0, 4000), length: field(fd, "length", 40) });
      const taken = new Set([...(await listArticles()).map((a) => a.slug), ...(await db<{ slug: string }[]>`select slug from articles`).map((r) => r.slug)]);
      const base = slugify(out.title);
      let slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
      const [row] = await db<{ id: string }[]>`
        insert into articles (slug, title, description, body, cover, cover_type, cover_w, cover_h, image_alt, author, status, publish_at, created_by)
        values (${slug}, ${out.title}, ${out.description || out.title}, ${out.body}, ${cover?.data ?? null}, ${cover?.type ?? null}, ${cover?.w ?? null}, ${cover?.h ?? null},
          ${field(fd, "image_alt", 200) || null}, ${admin.name}, 'draft', null, ${admin.id}) returning id`;
      await flash("AI wrote a draft. Read it, edit anything, then save. Nothing is live until it's published.");
      return back(row.id);
    } catch (e) {
      await flash(e instanceof Error ? e.message : "The AI draft didn't work. Try again.", "error");
      return back(/^\d+$/.test(id) ? id : undefined);
    }
  }

  if (action === "save") {
    const title = field(fd, "title", 200);
    const description = field(fd, "description", 300);
    const body = String(fd.get("body") ?? "").slice(0, 60000);
    if (!title || !description || !body.trim()) {
      await flash("Enter a title, a short summary and the article text.", "error");
      return back(/^\d+$/.test(id) ? id : undefined);
    }
    let mode = field(fd, "publish", 10); // draft | now | schedule | keep | review
    let wantsReview = mode === "review";
    if (!superadmin && (mode === "now" || mode === "schedule")) { wantsReview = true; mode = "draft"; }
    if (wantsReview) mode = "draft";
    let status = "draft";
    let publishAt: Date | null = null;
    if (mode === "now") { status = "published"; publishAt = new Date(); }
    if (mode === "schedule") {
      publishAt = easternToDate(field(fd, "publish_at", 20));
      if (!publishAt) {
        await flash("Choose the date and time to release the article.", "error");
        return back(/^\d+$/.test(id) ? id : undefined);
      }
      status = "published";
    }
    if (mode === "keep" && /^\d+$/.test(id)) {
      const [cur] = await db<{ status: string; publish_at: Date | null }[]>`select status, publish_at from articles where id = ${id}`;
      status = cur?.status ?? "draft"; publishAt = cur?.publish_at ?? null;
    }
    const file = fd.get("cover");
    let cover: { data: Buffer; type: string; w: number; h: number } | null = null;
    if (file instanceof File && file.size) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const dim = file.size <= MAX_COVER ? imageSize(bytes) : null;
      if (!dim) {
        await flash("The cover must be a JPG, PNG or WebP image under 8 MB.", "error");
        return back(/^\d+$/.test(id) ? id : undefined);
      }
      cover = { data: Buffer.from(bytes), type: dim.type, w: dim.w, h: dim.h };
    }
    const alt = field(fd, "image_alt", 200) || null;
    const author = field(fd, "author", 80) || admin.name;

    if (/^\d+$/.test(id)) {
      await db`update articles set title = ${title}, description = ${description}, body = ${body}, image_alt = ${alt}, author = ${author},
        status = ${status}, publish_at = ${publishAt}, updated_at = now() where id = ${id}`;
      if (cover) await db`update articles set cover = ${cover.data}, cover_type = ${cover.type}, cover_w = ${cover.w}, cover_h = ${cover.h} where id = ${id}`;
      if (wantsReview) await askReview(id, title);
      await flash(wantsReview ? `Saved ${title} as a draft and sent it for review.` : `Saved ${title}.`);
      return back(id);
    }
    // New article: a unique slug that doesn't clash with the old site's articles either.
    const taken = new Set([...(await listArticles()).map((a) => a.slug), ...(await db<{ slug: string }[]>`select slug from articles`).map((r) => r.slug)]);
    const base = slugify(title);
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    const [row] = await db<{ id: string }[]>`
      insert into articles (slug, title, description, body, cover, cover_type, cover_w, cover_h, image_alt, author, status, publish_at, created_by)
      values (${slug}, ${title}, ${description}, ${body}, ${cover?.data ?? null}, ${cover?.type ?? null}, ${cover?.w ?? null}, ${cover?.h ?? null},
        ${alt}, ${author}, ${status}, ${publishAt}, ${admin.id}) returning id`;
    if (wantsReview) await askReview(row.id, title);
    await flash(status === "published" ? `Saved ${title}. Choose where to share it below.` : wantsReview ? `Saved ${title} as a draft and sent it for review.` : `Saved ${title} as a draft.`);
    return back(row.id);
  }

  if (action === "unpublish" && /^\d+$/.test(id)) {
    await db`update articles set status = 'draft', updated_at = now() where id = ${id}`;
    await db`update article_posts set status = 'canceled' where article_id = ${id} and status = 'queued'`;
    await flash("Unpublished. Scheduled posts for this article were canceled.");
    return back(id);
  }

  if (action === "delete" && /^\d+$/.test(id)) {
    const [r] = await db<{ title: string }[]>`delete from articles where id = ${id} returning title`;
    if (r) await flash(`Deleted ${r.title}.`);
    return back();
  }

  if (action === "send" && /^\d+$/.test(id)) {
    const picked = fd.get("all") === "yes" ? CHANNELS.map((c) => c.id) : fd.getAll("channel").map(String).filter(isChannel);
    if (!picked.length) {
      await flash("Check at least one outlet, or All outlets.", "error");
      return back(id);
    }
    const [a] = await db<{ title: string; description: string; slug: string; status: string }[]>`select title, description, slug, status from articles where id = ${id}`;
    if (!a) return back();
    if (a.status !== "published") {
      await flash("Publish or schedule the article first, then send it.", "error");
      return back(id);
    }
    const message = String(fd.get("message") ?? "").trim().slice(0, 3000) || defaultMessage(a);
    const when = field(fd, "when", 10) === "schedule" ? easternToDate(field(fd, "send_at", 20)) : new Date();
    if (!when) {
      await flash("Choose the date and time to send.", "error");
      return back(id);
    }
    const [p] = await db<{ id: string }[]>`insert into article_posts (article_id, channels, message, scheduled_at, created_by)
      values (${id}, ${picked}, ${message}, ${when}, ${admin.id}) returning id`;
    if (when.getTime() <= Date.now() + 30_000) {
      const r = await runPost(p.id);
      if (r && "waiting" in r) await flash("Queued. It goes out as soon as the article is live.");
      else await flash(r?.status === "sent" ? "Sent." : "Sent with problems. See the results below.", r?.status === "sent" ? "ok" : "error");
    } else {
      await flash(`Scheduled for ${when.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })} ET.`);
    }
    return back(id);
  }

  if (action === "cancel-post") {
    const pid = field(fd, "pid", 20);
    if (/^\d+$/.test(pid)) await db`update article_posts set status = 'canceled' where id = ${pid} and status = 'queued'`;
    await flash("Scheduled post canceled.");
    return back(/^\d+$/.test(id) ? id : undefined);
  }

  await dispatchDue();
  return back();
}
