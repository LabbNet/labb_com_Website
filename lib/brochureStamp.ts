import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Where each brochure's "Labb Authorized Channel Partner" placeholder sits, in PDF points from the top-left of its last page.
// cover: the placeholder text to paint over. text: the area the partner's lines go in.
type Spot = { cover: [number, number, number, number]; text: [number, number, number, number]; bg: [number, number, number]; ink: [number, number, number]; align: "left" | "center" };
const DARK: [number, number, number] = [64 / 255, 73 / 255, 81 / 255];
const BOOKLET: Spot = { cover: [38, 687, 246, 751], text: [46, 689, 240, 750], bg: DARK, ink: [1, 1, 1], align: "left" };
const KIOSK: Spot = { cover: [176, 594, 436, 645], text: [182, 596, 430, 638], bg: [1, 1, 1], ink: DARK, align: "center" };

export const STAMPED: Record<string, Spot> = {
  "oraflo-booklet": BOOKLET,
  "etest-cup-booklet": BOOKLET,
  "etest-swab-booklet": BOOKLET,
  "kiosk-brochure": KIOSK,
};

// Prints the member's contact lines into the partner box. Shrinks the type until every line fits.
export async function stampPartner(pdf: Uint8Array, slug: string, contact: string | null): Promise<Uint8Array> {
  const spot = STAMPED[slug];
  const lines = (contact || "").replace(/[^\x20-\x7E\n\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022]/g, "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6);
  if (!spot || !lines.length) return pdf;
  const doc = await PDFDocument.load(pdf);
  const page = doc.getPage(doc.getPageCount() - 1);
  const H = page.getHeight();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const [cx1, cy1, cx2, cy2] = spot.cover;
  page.drawRectangle({ x: cx1, y: H - cy2, width: cx2 - cx1, height: cy2 - cy1, color: rgb(...spot.bg) });
  const [x1, y1, x2, y2] = spot.text;
  const w = x2 - x1, h = y2 - y1;
  let size = 10.5;
  const font = (i: number) => (i === 0 ? bold : reg);
  const fits = (s: number) => lines.length * s * 1.3 <= h && lines.every((l, i) => font(i).widthOfTextAtSize(l, s) <= w);
  while (size > 6 && !fits(size)) size -= 0.25;
  const lead = size * 1.3;
  let y = H - y1 - (h - lines.length * lead) / 2 - size; // vertically centered block
  lines.forEach((l, i) => {
    const f = font(i);
    let t = l;
    while (t.length > 1 && f.widthOfTextAtSize(t, size) > w) t = t.slice(0, -1);
    const tw = f.widthOfTextAtSize(t, size);
    page.drawText(t, { x: spot.align === "center" ? x1 + (w - tw) / 2 : x1, y, size, font: f, color: rgb(...spot.ink) });
    y -= lead;
  });
  return doc.save();
}
