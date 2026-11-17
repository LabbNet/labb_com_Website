import { readFile } from "node:fs/promises";
import path from "node:path";
import { currentMember } from "@/lib/auth";
import { drugSheet } from "@/lib/drugSheets";

// Serves a Drug Profile sheet to signed-in CPP members only. The PDFs are not in /public.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const m = await currentMember();
  if (!m) return Response.redirect(new URL("/login?next=/members", req.url), 303);
  const { slug } = await params;
  const s = drugSheet(slug);
  if (!s) return new Response("Not found", { status: 404 });
  const data = await readFile(path.join(process.cwd(), "private", "drug-sheets", s.file));
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="Labb-${s.file}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
    },
  });
}
