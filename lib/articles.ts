import data from "@/content/articles.json";
import { dbConfigured, sql } from "@/lib/db";
import { renderBody, wordCount } from "@/lib/articleFormat";

export type Article = {
  slug: string;
  title: string;
  publishedAt: string;
  author: string;
  image?: string;
  imageAlt?: string | null;
  imageW?: number;
  imageH?: number;
  description: string;
  html: string;
  words: number;
  draft?: boolean; // hidden from lists and the sitemap; viewable at its URL for review
  dbId?: string; // written in Admin -> Articles
};

// Articles imported from the old site (content/articles.json).
const legacy: Article[] = (data as Article[]).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

type Row = {
  id: string; slug: string; title: string; description: string; body: string; cover_type: string | null; cover_w: number | null;
  cover_h: number | null; image_alt: string | null; author: string; status: string; publish_at: Date | null; updated_at: Date;
};

const toArticle = (r: Row): Article => ({
  slug: r.slug,
  title: r.title,
  publishedAt: (r.publish_at ?? r.updated_at).toISOString(),
  author: r.author,
  image: r.cover_type ? `/api/articles/${r.id}/cover?v=${r.updated_at.getTime()}` : undefined,
  imageAlt: r.image_alt,
  imageW: r.cover_w ?? undefined,
  imageH: r.cover_h ?? undefined,
  description: r.description,
  html: renderBody(r.body),
  words: wordCount(r.body),
  draft: !(r.status === "published" && r.publish_at && r.publish_at.getTime() <= Date.now()),
  dbId: r.id,
});

const COLS = "id, slug, title, description, body, cover_type, cover_w, cover_h, image_alt, author, status, publish_at, updated_at";

async function live(): Promise<Article[]> {
  if (!dbConfigured) return [];
  try {
    const rows = await sql()<Row[]>`select ${sql()(COLS.split(", "))} from articles where status = 'published' and publish_at <= now()`;
    return rows.map(toArticle);
  } catch {
    return [];
  }
}

// Published articles, newest first: the old site's plus those written in admin whose release time has passed.
export async function listArticles(): Promise<Article[]> {
  return [...(await live()), ...legacy.filter((a) => !a.draft)].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

// One article by slug. Drafts and scheduled articles are returned (flagged draft) so admins can preview them.
export async function findArticle(slug: string): Promise<Article | undefined> {
  const old = legacy.find((a) => a.slug === slug);
  if (old) return old;
  if (!dbConfigured) return undefined;
  try {
    const [r] = await sql()<Row[]>`select ${sql()(COLS.split(", "))} from articles where slug = ${slug}`;
    return r ? toArticle(r) : undefined;
  } catch {
    return undefined;
  }
}
