import sharp from "sharp";
import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { go } from "@/lib/http";

// A CPP member's logo for their quotes, recolored to Labb dark grey (#404951) on a transparent background.
const GREY = [0x40, 0x49, 0x51];

async function toGrey(buf: Buffer) {
  const img = sharp(buf, { density: 300 }).rotate().resize({ width: 900, height: 360, fit: "inside", withoutEnlargement: true }).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;
  // How dark each pixel is (0 = white, 1 = black), among pixels that aren't transparent.
  const dark: number[] = [];
  for (let i = 0; i < px; i++) {
    const a = data[i * 4 + 3];
    if (a < 20) continue;
    dark.push(1 - (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255);
  }
  dark.sort((x, y) => x - y);
  const median = dark.length ? dark[Math.floor(dark.length / 2)] : 0;
  const top = dark.length ? dark[Math.floor(dark.length * 0.95)] : 1;
  const transparentBg = dark.length < px * 0.9;
  // A light logo on a transparent background (white text, say) keeps its shape; anything else is shaded by darkness.
  const silhouette = transparentBg && median < 0.25;
  const out = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    const a = data[i * 4 + 3] / 255;
    const d = 1 - (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
    const strength = silhouette ? 1 : Math.min(1, Math.max(0, (d - 0.06) / Math.max(0.15, top - 0.06)));
    out[i * 4] = GREY[0]; out[i * 4 + 1] = GREY[1]; out[i * 4 + 2] = GREY[2];
    out[i * 4 + 3] = Math.round(255 * a * strength);
  }
  const png = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

export async function POST(req: Request) {
  const back = "/members/quotes#branding";
  const m = await currentMember();
  if (!m) return go(req, "/login?next=/members/quotes");
  if (!(await sameOrigin())) return go(req, back);
  const fd = await req.formData();
  const flash = (msg: string, kind: "ok" | "error" = "ok") => setFlash(msg, kind, undefined, "/members");
  if (fd.get("remove") === "1") {
    await sql()`update members set logo_png = null, updated_at = now() where id = ${m.id}`;
    await flash("Logo removed. Your quotes show your company name instead.");
    return go(req, back);
  }
  const f = fd.get("logo");
  if (!(f instanceof File) || !f.size) { await flash("Choose a logo file.", "error"); return go(req, back); }
  if (f.size > 3 * 1024 * 1024) { await flash("That file is over 3 MB. Use a smaller logo.", "error"); return go(req, back); }
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) { await flash("Use a PNG, JPG, WebP or SVG file.", "error"); return go(req, back); }
  try {
    const dataUrl = await toGrey(Buffer.from(await f.arrayBuffer()));
    if (dataUrl.length > 600_000) { await flash("That logo is too detailed to use. Try a simpler or smaller file.", "error"); return go(req, back); }
    await sql()`update members set logo_png = ${dataUrl}, updated_at = now() where id = ${m.id}`;
    await flash("Logo saved in dark grey. It now appears on your quotes next to Labb's.");
  } catch (e) {
    console.error("[logo]", e);
    await flash("That file couldn't be read as an image. Try a PNG or JPG.", "error");
  }
  return go(req, back);
}
