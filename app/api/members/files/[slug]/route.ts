import { readFile } from "node:fs/promises";
import path from "node:path";
import { currentMember } from "@/lib/auth";
import { go } from "@/lib/http";
import { memberFile } from "@/lib/memberFiles";

// Serves a member-only PDF to signed-in CPP members. The files are not in /public.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const m = await currentMember();
  if (!m) return go(req, "/login?next=/members");
  const { slug } = await params;
  const f = memberFile(slug);
  if (!f) return new Response("Not found", { status: 404 });
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
