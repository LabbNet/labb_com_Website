"use client";

import Image from "next/image";
import { useState } from "react";

type Img = { src: string; alt: string; w: number; h: number };

// Main product image with clickable thumbnails. Without extra views it renders the single image.
export function KitGallery({ main, images, reader }: { main: Img; images?: Img[]; reader?: boolean }) {
  const all = images?.length ? images : [main];
  const [i, setI] = useState(0);
  const cur = all[i];
  return (
    <div>
      <div className="kit-stage">
        <Image key={cur.src} src={cur.src} alt={cur.alt} width={cur.w} height={cur.h} priority={i === 0} sizes="(max-width: 900px) 90vw, 520px" />
        {reader && i === 0 && <ReaderBadge />}
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

// "Digital reader capable" seal shown on the primary kit image on detail pages.
export function ReaderBadge() {
  return (
    <a href="/labb-station" className="reader-badge" title="Read this kit with Labb Station on a phone or tablet">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="rb-icon">
        <rect x="11" y="4" width="18" height="32" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <line x1="17.5" y1="32" x2="22.5" y2="32" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M15 12v-2.5h2.5M25 12v-2.5h-2.5M15 21v2.5h2.5M25 21v2.5h-2.5" fill="none" stroke="#CF743C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.6 16.6l2.4 2.4 4.4-4.6" fill="none" stroke="#CF743C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="rb-text"><strong>Digital reader capable</strong><span>Works with Labb Station</span></span>
    </a>
  );
}
