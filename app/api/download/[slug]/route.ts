import { readFile } from "node:fs/promises";
import path from "node:path";
import { getResource } from "@/lib/resources";
import { memberFile } from "@/lib/memberFiles";
import { COOKIE, verify } from "@/lib/session";
import { go } from "@/lib/http";

// Free guidebook download. Unlocked by the signed cookie set when the visitor submits the lead form
// on the guidebook's landing page (or by being a signed-in CPP member).
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = getResource(slug);
  const f = r?.file ? memberFile(r.file) : undefined;
  if (!r || !f) return new Response("Not found", { status: 404 });
  const access = await verify(req.headers.get("cookie")?.match(new RegExp(`${COOKIE}=([^;]+)`))?.[1]);
  if (!access?.lead && !access?.member) return go(req, `/resources/${slug}#get`);
  const data = await readFile(path.join(process.cwd(), "private", "member-files", f.file));
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="Labb-${f.file}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
    },
  });
}
