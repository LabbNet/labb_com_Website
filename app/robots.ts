import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { absoluteUrl } from "@/lib/site";

// Only labb.com is crawlable. Any other host (the Render address, previews) disallows everything.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get("x-forwarded-host") || (await headers()).get("host") || "").toLowerCase().split(":")[0];
  const live = host === "labb.com" || host === "www.labb.com";
  if (!live || process.env.NEXT_PUBLIC_NOINDEX === "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/members", "/admin", "/account", "/login", "/forgot-password", "/reset-password", "/thank-you", "/contract/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
