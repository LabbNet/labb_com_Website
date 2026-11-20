import type { NextConfig } from "next";
import { redirects } from "./redirects";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const config: NextConfig = {
  trailingSlash: false,
  poweredByHeader: false,
  // Images in /public are already sized (max 2000px) and compressed to WebP, so serve them as-is.
  // On-the-fly resizing (especially AVIF) ran the server out of memory and caused 502s.
  images: { unoptimized: true },
  async redirects() {
    return redirects;
  },
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      // Only labb.com is indexed. The Render address (and any other host) tells search engines to stay
      // out, so the draft never competes with the real site and launch needs no setting change.
      { source: "/:path*", missing: [{ type: "host", value: "(www\\.)?labb\\.com" }], headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      ...["/kits/:path*", "/graphics/:path*", "/brand/:path*", "/img/:path*", "/news/:path*", "/data-sheets/:path*"].map((source) => ({ source, headers: cache })),
    ];
  },
};

export default config;
