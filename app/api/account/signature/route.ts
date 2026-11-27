import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { countersignWaiting } from "@/lib/salesQuotes";

// Save (or remove) the signature an admin or CPP member uses to countersign agreements when a client signs.
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m || (m.role !== "admin" && m.role !== "member")) return go(req, "/login");
  const fd = await req.formData();
  const back = field(fd, "back", 80).startsWith("/admin") && m.role === "admin" ? "/admin/signature" : "/members/account#signature";
  if (!(await sameOrigin())) return go(req, back);
  const flash = (msg: string, kind: "ok" | "error" = "ok") => setFlash(msg, kind, undefined, back.startsWith("/admin") ? "/admin" : "/members");
  if (fd.get("remove") === "1") {
    await sql()`update members set signature_png = null, signature_at = null where id = ${m.id}`;
    await flash("Signature removed. Agreements won't be countersigned automatically until you add one.");
    return go(req, back);
  }
  const png = String(fd.get("signature") ?? "");
  const name = field(fd, "sig_name", 120);
  const title = field(fd, "sig_title", 120);
  if (name.length < 3) { await flash("Enter your full name as it should appear under your signature.", "error"); return go(req, back); }
  const ok = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png) && png.length > 1500 && png.length < 400_000;
  if (!ok && !png) {
    // Name and title only: keep the existing drawing.
    const [r] = await sql()<{ signature_png: string | null }[]>`select signature_png from members where id = ${m.id}`;
    if (!r?.signature_png) { await flash("Draw your signature in the box first.", "error"); return go(req, back); }
    await sql()`update members set signature_name = ${name}, signature_title = ${title || null} where id = ${m.id}`;
    await flash("Name and title saved.");
    return go(req, back);
  }
  if (!ok) { await flash("That signature didn't come through. Draw it again and save.", "error"); return go(req, back); }
  await sql()`update members set signature_png = ${png}, signature_name = ${name}, signature_title = ${title || null}, signature_at = now() where id = ${m.id}`;
  const waiting = await countersignWaiting(m.id).catch(() => 0);
  await flash(`Signature saved. Agreements you're the rep on are countersigned with it as soon as the client signs.${waiting ? ` ${waiting} signed ${waiting === 1 ? "agreement was" : "agreements were"} waiting and ${waiting === 1 ? "is" : "are"} now countersigned.` : ""}`);
  return go(req, back);
}
