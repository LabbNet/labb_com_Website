import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";

// A graphic position on a page. If the file exists in /public it renders the image; otherwise it shows a
// labeled placeholder with the exact file name and size to supply. All Labb graphics are transparent
// PNG or WebP that work on white, light grey and dark grey (never orange).
export function GraphicSlot({
  src,
  alt,
  label,
  w = 1000,
  h = 1000,
  priority,
  sizes = "(max-width: 900px) 92vw, 560px",
  className,
}: {
  src: string; // path under /public, e.g. /graphics/home/hero-phone-scan.webp
  alt: string;
  label: string; // what the graphic should show
  w?: number;
  h?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const have = existsSync(join(process.cwd(), "public", src));
  if (have) {
    return <Image className={`gslot-img ${className || ""}`} src={src} alt={alt} width={w} height={h} priority={priority} sizes={sizes} />;
  }
  return (
    <div className={`gslot ${className || ""}`} style={{ aspectRatio: `${w} / ${h}` }} role="img" aria-label={alt}>
      <div>
        <strong>{label}</strong>
        <span>{src.split("/").pop()}</span>
        <span>{w} × {h}, transparent</span>
      </div>
    </div>
  );
}
