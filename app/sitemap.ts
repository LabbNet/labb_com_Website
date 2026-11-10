import type { MetadataRoute } from "next";
import { articles } from "@/lib/articles";
import { industries } from "@/lib/industries";
import { publishedKits } from "@/lib/kits";
import { resources } from "@/lib/resources";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/software", 0.9),
    page("/labb-station", 0.9),
    page("/labbhr", 0.9),
    page("/get-a-quote", 0.9),
    page("/oral-fluid-drug-testing", 0.9),
    page("/urine-drug-testing", 0.9),
    page("/test-kits", 0.9),
    ...publishedKits.map((k) => page(`/test-kits/${k.slug}`, 0.8)),
    ...industries.map((i) => page(`/industries/${i.slug}`, 0.8)),
    page("/channel-partner-program", 0.8),
    page("/training", 0.8),
    ...resources.map((r) => page(`/resources/${r.slug}`, 0.8)),
    page("/certifications", 0.6),
    page("/news", 0.6, "weekly"),
    ...articles.map((a) => ({ url: absoluteUrl(`/news/${a.slug}`), lastModified: new Date(a.publishedAt), changeFrequency: "yearly" as const, priority: 0.5 })),
    page("/contact", 0.5, "yearly"),
    page("/privacy", 0.2, "yearly"),
    page("/terms", 0.2, "yearly"),
  ];
}
