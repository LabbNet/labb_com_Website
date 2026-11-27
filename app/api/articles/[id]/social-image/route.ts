import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { sql } from "@/lib/db";

// An article's cover as a JPEG cropped to a social network's size. Social networks (Instagram especially)
// don't take WebP, and each wants its own shape:
//   ?for=linkedin|facebook|x  -> 1200x627 (1.91:1 link card)
//   ?for=instagram            -> 1080x1350 (4:5 portrait, the tallest Instagram allows in the feed)
const SIZES = { linkedin: [1200, 627], facebook: [1200, 630], x: [1200, 628], instagram: [1080, 1350] } as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const net = new URL(req.url).searchParams.get("for") ?? "linkedin";
  const size = SIZES[net as keyof typeof SIZES] ?? SIZES.linkedin;
  const [r] = await sql()<{ cover: Buffer | null; cover_url: string | null }[]>`select cover, cover_url from articles where id = ${id}`;
  let src: Buffer | null = r?.cover ?? null;
  if (!src && r?.cover_url?.startsWith("/") && !r.cover_url.includes("..")) {
    src = await readFile(path.join(process.cwd(), "public", r.cover_url)).catch(() => null);
  }
  if (!src) return new NextResponse("Not found", { status: 404 });
  const jpg = await sharp(src)
    .rotate()
    .resize(size[0], size[1], { fit: "cover", position: sharp.strategy.attention })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  return new NextResponse(new Uint8Array(jpg), {
    headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400" },
  });
}
