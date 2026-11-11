"use client";

import { useState } from "react";

// Before / after: drag the divider across two graphics of the same size.
export function CompareSlider({ left, right, leftLabel, rightLabel }: { left: React.ReactNode; right: React.ReactNode; leftLabel: string; rightLabel: string }) {
  const [v, setV] = useState(50);
  return (
    <div className="cmp">
      <div className="cmp-stage">
        <div className="cmp-layer">{right}</div>
        <div className="cmp-layer cmp-top" style={{ clipPath: `inset(0 ${100 - v}% 0 0)` }}>{left}</div>
        <div className="cmp-bar" style={{ left: `${v}%` }} aria-hidden="true"><span>⟷</span></div>
        <span className="cmp-tag l">{leftLabel}</span>
        <span className="cmp-tag r">{rightLabel}</span>
      </div>
      <input className="cmp-range" type="range" min={0} max={100} step={1} value={v} onChange={(e) => setV(Number(e.target.value))} aria-label={`Compare ${leftLabel} and ${rightLabel}`} />
    </div>
  );
}
