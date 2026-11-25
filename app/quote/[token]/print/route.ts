import { currentMember } from "@/lib/auth";
import { getQuoteByToken, renderQuote } from "@/lib/salesQuotes";

// The quote on its own, laid out for printing or saving as a PDF (uses the template's print styles).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getQuoteByToken(token);
  if (!data) return new Response("Not found", { status: 404 });
  if (data.q.status === "draft" && (await currentMember())?.role !== "admin") return new Response("Not found", { status: 404 });
  const html = renderQuote(data.q, data.items, data.lead, data.rep);
  const full = /<html[\s>]/i.test(html) ? html : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Labb quote</title></head><body>${html}</body></html>`;
  // Links open in a new tab, so the quote page stays put when it's shown inside labb.com.
  const doc = /<head[^>]*>/i.test(full) ? full.replace(/<head([^>]*)>/i, '<head$1><base target="_blank">') : full;
  return new Response(doc, {
    headers: {
      "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; base-uri 'self'; form-action 'none'",
    },
  });
}
