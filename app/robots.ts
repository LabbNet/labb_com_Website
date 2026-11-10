import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_NOINDEX === "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/members", "/admin", "/account", "/login", "/forgot-password", "/reset-password", "/thank-you"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
