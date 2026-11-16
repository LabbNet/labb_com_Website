import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";

// Admin-only download of a stored CPP contract.
export async function GET(_req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return new Response("Not found", { status: 404 });
  const { cid } = await params;
  if (!/^\d+$/.test(cid)) return new Response("Not found", { status: 404 });
  const [c] = await sql()<{ filename: string; content_type: string; data: Buffer }[]>`
    select filename, content_type, data from member_contracts where id = ${cid}`;
  if (!c) return new Response("Not found", { status: 404 });
  const inline = c.content_type === "application/pdf" || c.content_type.startsWith("image/");
  return new Response(new Uint8Array(c.data), {
    headers: {
      "content-type": c.content_type,
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${c.filename.replace(/"/g, "")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
