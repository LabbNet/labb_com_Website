import { sql } from "@/lib/db";

// Images used in quote templates (stored when a template is uploaded).
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-f0-9]{24}\.(png|jpg|jpeg|gif|webp|svg)$/.test(file)) return new Response("Not found", { status: 404 });
  const [a] = await sql()<{ mime: string; data: Buffer }[]>`select mime, data from quote_assets where id = ${file}`;
  if (!a) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(a.data), {
    headers: { "Content-Type": a.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", ...(a.mime.includes("svg") ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } : {}) },
  });
}
