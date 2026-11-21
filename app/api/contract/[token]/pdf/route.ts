import { NextResponse } from "next/server";
import { isOpen, requestByToken, templatePdf } from "@/lib/contracts";

// The agreement PDF for an open signing link.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const r = await requestByToken((await params).token);
  if (!r || !isOpen(r)) return new NextResponse("This link has expired or has already been used.", { status: 404 });
  const t = await templatePdf(r.template_id);
  if (!t) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(t.data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="Labb CPP Agreement v${r.version.replace(/[^\w.-]/g, "")}.pdf"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
