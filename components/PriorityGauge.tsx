// Labb Screening Priority Index gauge: 10 segments filled up to the score, with a needle.
// Matches the gauge printed on the Drug Profile Series sheets.
const SHADES = ["#F6D9C4", "#F2C7A8", "#EDB48C", "#E8A170", "#E38F57", "#DD7F45", "#CF743C", "#BE6532", "#AC5829", "#994C22"];

function arc(cx: number, cy: number, r: number, a0: number, a1: number, w: number) {
  const p = (a: number, rr: number) => [cx + rr * Math.cos((a * Math.PI) / 180), cy - rr * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0, r), [x1, y1] = p(a1, r), [x2, y2] = p(a1, r - w), [x3, y3] = p(a0, r - w);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r - w} ${r - w} 0 0 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
}

export function PriorityGauge({ index, size = 64, className }: { index: number; size?: number; className?: string }) {
  const cx = 50, cy = 50, r = 44, w = 13;
  const needle = 180 - index * 18;
  const nx = cx + 34 * Math.cos((needle * Math.PI) / 180), ny = cy - 34 * Math.sin((needle * Math.PI) / 180);
  return (
    <svg viewBox="0 0 100 56" width={size} height={(size * 56) / 100} className={className} aria-hidden="true">
      {SHADES.map((c, i) => (
        <path key={i} d={arc(cx, cy, r, 180 - i * 18 - 1, 180 - (i + 1) * 18 + 1, w)} fill={i < index ? c : "#E3E6E8"} />
      ))}
      <line x1={cx} y1={cy} x2={nx.toFixed(2)} y2={ny.toFixed(2)} stroke="#404951" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#404951" />
    </svg>
  );
}
