"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { openConnect, track } from "./connect";

export type ShelfKit = {
  slug: string;
  code: string;
  name: string;
  series: string;
  specimen: string;
  badge: string;
  badgeLabel: string;
  drugCount: number;
  readTime: string;
  image: string;
  summary: string;
  drugs: { code: string; name: string; cutoff: string }[];
};

const FILTERS = [
  { k: "all", label: "All" },
  { k: "Oral fluid", label: "Oral fluid" },
  { k: "Urine", label: "Urine" },
  { k: "EUO", label: "Employment use only" },
  { k: "FUO", label: "Forensic" },
];

// All kit renders in a row on light grey, filterable; clicking a kit opens a quick view without leaving the page.
export function KitShelf({ kits, segment }: { kits: ShelfKit[]; segment?: string }) {
  const [f, setF] = useState("all");
  const [cur, setCur] = useState<ShelfKit | null>(null);
  useEffect(() => {
    if (!cur) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setCur(null);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [cur]);
  const shown = kits.filter((k) => f === "all" || k.specimen === f || k.badge === f);
  return (
    <div>
      <div className="chips-filter" role="group" aria-label="Filter kits">
        {FILTERS.map((x) => (
          <button key={x.k} type="button" aria-pressed={f === x.k} onClick={() => setF(x.k)}>{x.label}</button>
        ))}
      </div>
      <div className="shelf">
        {shown.map((k) => (
          <button key={k.slug} type="button" className="shelf-kit" onClick={() => { setCur(k); track("kit_quickview", k.code); }}>
            <Image src={k.image} alt="" width={600} height={600} sizes="200px" />
            <strong>{k.code}</strong>
            <span>{k.specimen} · {k.drugCount} drugs</span>
          </button>
        ))}
      </div>
      {cur && (
        <div className="drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && setCur(null)}>
          <div className="drawer" role="dialog" aria-modal="true" aria-label={`${cur.name} quick view`}>
            <button type="button" className="drawer-x" aria-label="Close" onClick={() => setCur(null)}>×</button>
            <div className="qv-img"><Image src={cur.image} alt={cur.name} width={600} height={600} sizes="360px" /></div>
            <span className={`pill${cur.badge === "FUO" ? " forensic" : ""}`}>{cur.badgeLabel}</span>
            <h2 style={{ margin: "10px 0 6px" }}>{cur.name}</h2>
            <p style={{ color: "var(--muted)" }}>{cur.summary}</p>
            <table className="panel-table">
              <thead><tr><th scope="col">Code</th><th scope="col">Drug</th><th scope="col">Cutoff</th></tr></thead>
              <tbody>{cur.drugs.map((d) => <tr key={d.code}><td>{d.code}</td><td>{d.name}</td><td>{d.cutoff}</td></tr>)}</tbody>
            </table>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={() => { const k = cur; setCur(null); openConnect({ topic: `${k.code} quote`, segment, products: ["Test kits"], title: `Get a quote for ${k.code}` }); }}>Get a quote</button>
              <Link href={`/test-kits/${cur.slug}`} className="btn btn-outline">Full details</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
