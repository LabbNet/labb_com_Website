import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Cover image for an article written in admin. Public (it's shown on the article and shared to social media).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const [r] = await sql()<{ cover: Buffer | null; cover_type: string | null }[]>`select cover, cover_type from articles where id = ${id}`;
  if (!r?.cover || !r.cover_type) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(r.cover), {
    headers: { "content-type": r.cover_type, "cache-control": "public, max-age=86400" },
  });
}
