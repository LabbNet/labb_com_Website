import data from "@/content/articles.json";

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
};

const all: Article[] = (data as Article[]).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
export const articles: Article[] = all.filter((a) => !a.draft);

export const getArticle = (slug: string) => all.find((a) => a.slug === slug);
export const allArticleSlugs = () => all.map((a) => a.slug);
