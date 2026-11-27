import { readFile } from "node:fs/promises";
import path from "node:path";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { guidebook, GUIDEBOOKS_LIVE } from "@/lib/guidebooks";
import { memberFile } from "@/lib/memberFiles";

// A guidebook PDF for someone holding an emailed guidebook link (?t=token). Always the current edition.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = new URL(req.url).searchParams.get("t") || "";
  const g = guidebook(slug);
  const f = g ? memberFile(g.file) : undefined;
  if (!g || !f || !/^[A-Za-z0-9_-]{20,40}$/.test(t)) return new Response("Not found", { status: 404 });
  if (!GUIDEBOOKS_LIVE && (await currentMember())?.role !== "admin") return new Response("Not found", { status: 404 });
  const [a] = await sql()<{ slugs: string[] }[]>`select slugs from guidebook_access where token = ${t}`;
  if (!a || !a.slugs.includes(slug)) return new Response("Not found", { status: 404 });
  const data = await readFile(path.join(process.cwd(), "private", "member-files", f.file));
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="Labb-${f.file}"`,
      "cache-control": "private, no-store", "x-content-type-options": "nosniff", "x-robots-tag": "noindex",
    },
  });
}
