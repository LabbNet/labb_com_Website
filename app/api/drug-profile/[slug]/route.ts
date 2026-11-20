import { readFile } from "node:fs/promises";
import path from "node:path";
import { drugSheet } from "@/lib/drugSheets";
import { COOKIE, verify } from "@/lib/session";
import { go } from "@/lib/http";

// Full Drug Profile PDF. Unlocked by the signed cookie set when the visitor submits the form on the
// drug's page, or by being a signed-in CPP member.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = drugSheet(slug);
  if (!s) return new Response("Not found", { status: 404 });
  const access = await verify(req.headers.get("cookie")?.match(new RegExp(`${COOKIE}=([^;]+)`))?.[1]);
  if (!access?.lead && !access?.member) return go(req, `/drugs/${slug}#get`);
  const data = await readFile(path.join(process.cwd(), "private", "drug-sheets", s.file));
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="Labb-${s.file}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
    },
  });
}
