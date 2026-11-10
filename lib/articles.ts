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
};

export const articles: Article[] = (data as Article[]).sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);

export const getArticle = (slug: string) => articles.find((a) => a.slug === slug);
