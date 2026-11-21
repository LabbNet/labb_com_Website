import { NextResponse } from "next/server";
import { currentMember } from "@/lib/auth";
import { templatePdf } from "@/lib/contracts";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return new NextResponse("Not found", { status: 404 });
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const t = await templatePdf(id);
  if (!t) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(t.data), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${t.filename.replace(/"/g, "")}"`, "cache-control": "private, no-store", "x-robots-tag": "noindex" },
  });
}
