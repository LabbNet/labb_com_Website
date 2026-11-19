"use client";

import { useState } from "react";

// Daily page views (bars) and visitors (line) on one count axis, with a hover readout.
const VIEWS = "#CF743C";
const VISITORS = "#2F6FB0";

export function AnalyticsChart({ data }: { data: { day: string; views: number; visitors: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 960, H = 260, L = 44, R = 12, T = 12, B = 28;
  const max = Math.max(4, ...data.map((d) => Math.max(d.views, d.visitors)));
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const ticks = [0, top / 2, top];
  const n = data.length;
  const bw = (W - L - R) / n;
  const x = (i: number) => L + i * bw + bw / 2;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const fmtDay = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const labelEvery = Math.ceil(n / 8);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.visitors).toFixed(1)}`).join(" ");
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="an-chart">
      <div className="an-legend" aria-hidden="true">
        <span><i style={{ background: VIEWS }} /> Page views</span>
        <span><i className="ln" style={{ background: VISITORS }} /> Visitors</span>
      </div>
      <div className="an-plot" onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily page views and visitors">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e4e8e8" strokeWidth={1} />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="an-tick">{t.toLocaleString()}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const bh = Math.max(0, y(0) - y(d.views));
            const w = Math.max(2, Math.min(28, bw - 2));
            return (
              <g key={d.day}>
                {bh > 0 && <path d={`M${x(i) - w / 2},${y(0)} v${-(bh - Math.min(4, bh))} q0,-${Math.min(4, bh)} ${Math.min(4, w / 2)},-${Math.min(4, bh)} h${w - 2 * Math.min(4, w / 2)} q${Math.min(4, w / 2)},0 ${Math.min(4, w / 2)},${Math.min(4, bh)} v${bh - Math.min(4, bh)} z`} fill={VIEWS} opacity={hover === null || hover === i ? 1 : 0.55} />}
                {i % labelEvery === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" className="an-tick">{fmtDay(d.day)}</text>}
              </g>
            );
          })}
          <path d={line} fill="none" stroke={VISITORS} strokeWidth={2} strokeLinejoin="round" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={y(0)} stroke="#8a949c" strokeWidth={1} />}
          {hover !== null && <circle cx={x(hover)} cy={y(data[hover].visitors)} r={4.5} fill={VISITORS} stroke="#fff" strokeWidth={2} />}
          {data.map((d, i) => (
            <rect key={d.day} x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" tabIndex={0}
              aria-label={`${fmtDay(d.day)}: ${d.views} page views, ${d.visitors} visitors`}
              onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
          ))}
        </svg>
        {h && hover !== null && (
          <div className="an-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
            <div className="an-tip-day">{fmtDay(h.day)}</div>
            <div><i style={{ background: VIEWS }} /><strong>{h.views.toLocaleString()}</strong> page views</div>
            <div><i style={{ background: VISITORS }} /><strong>{h.visitors.toLocaleString()}</strong> visitors</div>
          </div>
        )}
      </div>
    </div>
  );
}
