"use client";

import Image from "next/image";
import { useState } from "react";

type Img = { src: string; alt: string; w: number; h: number };

// Main product image with clickable thumbnails. Without extra views it renders the single image.
export function KitGallery({ main, images }: { main: Img; images?: Img[] }) {
  const all = images?.length ? images : [main];
  const [i, setI] = useState(0);
  const cur = all[i];
  return (
    <div>
      <div className="kit-stage">
        <Image key={cur.src} src={cur.src} alt={cur.alt} width={cur.w} height={cur.h} priority={i === 0} sizes="(max-width: 900px) 90vw, 520px" />
      </div>
      {all.length > 1 && (
        <div className="kit-thumbs" role="list" aria-label="Product views">
          {all.map((img, n) => (
            <button
              key={img.src}
              type="button"
              role="listitem"
              className={n === i ? "on" : undefined}
              aria-label={`Show: ${img.alt}`}
              aria-pressed={n === i}
              onClick={() => setI(n)}
            >
              <Image src={img.src} alt="" width={img.w} height={img.h} sizes="90px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
