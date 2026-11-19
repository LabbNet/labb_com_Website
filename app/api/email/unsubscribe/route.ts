import { checkUnsub, suppress, type Audience } from "@/lib/broadcast";

// Unsubscribe. Two callers:
//  - mail apps' one-click unsubscribe (RFC 8058): POST with e/a/t in the query string
//  - the confirm button on /unsubscribe: POST form with e/a/t and from=page
export async function POST(req: Request) {
  const url = new URL(req.url);
  const fd = (req.headers.get("content-type") || "").includes("form") ? await req.formData().catch(() => null) : null;
  const get = (k: string) => String(fd?.get(k) || url.searchParams.get(k) || "");
  const [e, a, t] = [get("e"), get("a"), get("t")];
  const ok = checkUnsub(e, a, t);
  if (ok) await suppress(e, a as Audience);
  if (fd?.get("from") === "page") {
    const back = new URL("/unsubscribe", url);
    back.searchParams.set("done", ok ? "1" : "0");
    return Response.redirect(back, 303);
  }
  return new Response(ok ? "Unsubscribed" : "Invalid link", { status: ok ? 200 : 400 });
}
