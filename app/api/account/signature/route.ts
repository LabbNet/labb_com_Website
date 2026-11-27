import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import sharp from "sharp";
import { countersignWaiting } from "@/lib/salesQuotes";

// An uploaded photo or scan of a signature: background removed, ink kept dark, cropped and sized for documents.
async function cleanSignature(buf: Buffer) {
  const { data, info } = await sharp(buf).rotate().resize({ width: 1200, height: 600, fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;
  const lum = new Float32Array(px);
  let sum = 0;
  for (let i = 0; i < px; i++) { lum[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255; sum += lum[i]; }
  const paper = Math.min(0.97, sum / px); // the page brightness, from the average
  const out = Buffer.alloc(px * 4);
  let ink = 0;
  for (let i = 0; i < px; i++) {
    const a = data[i * 4 + 3] / 255;
    const strength = Math.max(0, Math.min(1, (paper - 0.12 - lum[i]) / 0.35)) * a;
    if (strength > 0.3) ink++;
    out[i * 4] = 0x1f; out[i * 4 + 1] = 0x29; out[i * 4 + 2] = 0x33; out[i * 4 + 3] = Math.round(255 * strength);
  }
  if (ink < 50) return "";
  const png = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 1 })
    .resize({ width: 700, height: 220, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

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
  let png = String(fd.get("signature") ?? "");
  const file = fd.get("sig_file");
  if (file instanceof File && file.size) {
    if (file.size > 5 * 1024 * 1024 || !/^image\/(png|jpeg|webp)$/.test(file.type)) { await flash("Upload a PNG or JPG of your signature, up to 5 MB.", "error"); return go(req, back); }
    try { png = await cleanSignature(Buffer.from(await file.arrayBuffer())); }
    catch (e) { console.error("[signature] upload", e); await flash("That picture couldn't be read. Try a PNG or JPG.", "error"); return go(req, back); }
    if (!png) { await flash("No signature was found in that picture. Use dark ink on white paper and a clear photo.", "error"); return go(req, back); }
  }
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
