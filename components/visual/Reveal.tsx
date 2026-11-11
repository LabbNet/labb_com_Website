"use client";

import { useState } from "react";
import { ConnectButton } from "./ConnectDrawer";
import { track } from "./connect";

// The plus button. Detail text stays in the HTML (hidden until opened) so search engines index it.
export function PlusButton({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className={`plus${open ? " on" : ""}`} aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} details: ${label}`} onClick={onClick}>
      <span aria-hidden="true" />
    </button>
  );
}

export type RevealItem = {
  title: string;
  graphic?: React.ReactNode;
  body: React.ReactNode;
  topic?: string;
  cta?: string;
  href?: string; // optional link to a full page instead of (or as well as) the connect form
  hrefLabel?: string;
};

// Tiles with a graphic and a short title; the plus opens two or three sentences and a connect link.
export function RevealTiles({ items, segment, products, cols = 3 }: { items: RevealItem[]; segment?: string; products?: string[]; cols?: 2 | 3 | 4 }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else {
        n.add(i);
        track("reveal_open", items[i].topic || items[i].title);
      }
      return n;
    });
  return (
    <div className={`reveal-grid c${cols}`}>
      {items.map((it, i) => (
        <div key={it.title} className={`reveal-tile${open.has(i) ? " is-open" : ""}`}>
          {it.graphic && <div className="reveal-graphic">{it.graphic}</div>}
          <div className="reveal-head">
            <h3>{it.title}</h3>
            <PlusButton open={open.has(i)} onClick={() => toggle(i)} label={it.title} />
          </div>
          <div className="reveal-body" hidden={!open.has(i)}>
            <div>{it.body}</div>
            <div className="reveal-actions">
              {it.href && <a className="reveal-link" href={it.href}>{it.hrefLabel || "Learn more"} <span aria-hidden="true">→</span></a>}
              <ConnectButton topic={it.topic || it.title} segment={segment} products={products} label={it.cta || "Talk to us"} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// A product graphic with plus hotspots placed on it. One hotspot open at a time; detail shows beside the graphic.
export function Hotspots({
  graphic,
  title,
  intro,
  points,
  segment,
  products,
  cta = "Get a quote",
}: {
  graphic: React.ReactNode;
  title: string;
  intro: string;
  points: { x: number; y: number; title: string; body: React.ReactNode; topic?: string }[];
  segment?: string;
  products?: string[];
  cta?: string;
}) {
  const [cur, setCur] = useState<number | null>(null);
  const pick = (i: number) => {
    setCur(cur === i ? null : i);
    if (cur !== i) track("hotspot_open", points[i].topic || points[i].title);
  };
  return (
    <div className="hotspots">
      <div className="hotspots-stage">
        {graphic}
        {points.map((p, i) => (
          <div key={p.title} className="hotspot" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <PlusButton open={cur === i} onClick={() => pick(i)} label={p.title} />
          </div>
        ))}
      </div>
      <div className="hotspots-copy">
        <h2>{title}</h2>
        <p className="lede-sm">{intro}</p>
        <ol className="hotspot-list">
          {points.map((p, i) => (
            <li key={p.title} className={cur === i ? "on" : undefined}>
              <button type="button" onClick={() => pick(i)} aria-expanded={cur === i}>{p.title}</button>
              <div hidden={cur !== i}>
                <div>{p.body}</div>
                <ConnectButton topic={p.topic || p.title} segment={segment} products={products} label={cta} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
