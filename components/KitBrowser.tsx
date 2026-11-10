"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { badgeLabel, kitShort, type Kit } from "@/lib/kits";

const tagClass = (b: Kit["badge"]) => (b === "FUO" ? "tag forensic" : b === "OTC" ? "tag diag" : "tag");

export function KitBrowser({ kits }: { kits: Kit[] }) {
  const [specimen, setSpecimen] = useState<"All" | Kit["specimen"]>("All");
  const [use, setUse] = useState<"All" | Kit["badge"]>("All");
  const [drug, setDrug] = useState("");

  const drugs = useMemo(() => {
    const m = new Map<string, string>();
    kits.forEach((k) => k.drugs.forEach((d) => m.set(d.code, d.name)));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [kits]);

  const shown = kits.filter(
    (k) => (specimen === "All" || k.specimen === specimen) && (use === "All" || k.badge === use) && (!drug || k.drugs.some((d) => d.code === drug)),
  );

  const chip = <T extends string>(val: T, cur: T, set: (v: T) => void, label: string) => (
    <button type="button" className="chip" aria-pressed={cur === val} onClick={() => set(val)}>{label}</button>
  );

  return (
    <>
      <div className="filters" role="group" aria-label="Filter kits">
        <div className="grp">
          <span>Specimen</span>
          {chip("All", specimen, setSpecimen, "All")}
          {chip("Urine", specimen, setSpecimen, "Urine")}
          {chip("Oral fluid", specimen, setSpecimen, "Oral fluid")}
        </div>
        <div className="grp">
          <span>Use</span>
          {chip("All", use, setUse, "All")}
          {chip("EUO", use, setUse, "Workplace")}
          {chip("FUO", use, setUse, "Forensic")}
          {chip("OTC", use, setUse, "Diagnostic")}
        </div>
        <div className="grp">
          <span><label htmlFor="drug-filter">Tests for</label></span>
          <select id="drug-filter" value={drug} onChange={(e) => setDrug(e.target.value)}>
            <option value="">Any drug</option>
            {drugs.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}
          </select>
        </div>
      </div>
      <p className="showing" aria-live="polite">Showing {shown.length} kit{shown.length === 1 ? "" : "s"}</p>
      <div className="grid g4">
        {shown.map((k) => (
          <div key={k.slug} className="card kit2" id={k.specimen === "Urine" ? undefined : undefined}>
            <div className="ph">
              <Image src={k.image} alt={`${k.name} ${k.specimen.toLowerCase()} drug screen`} width={600} height={600} sizes="(max-width: 700px) 90vw, 280px" />
            </div>
            <div className="bd">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className={tagClass(k.badge)}>{badgeLabel[k.badge]}</span>
                <span className="tag plain">{k.specimen}</span>
              </div>
              <span className="series">{k.series} · {k.specimen === "Urine" ? "Urine drug screen cup" : "Oral fluid drug screen"}</span>
              <h3>{k.code === "ORF:31C" ? "ORF:31C OraFlo" : k.name.replace(/^eTest (Cup|Swab) /, "")}</h3>
              <p>{kitShort[k.slug] || k.summary}</p>
              <div className="chips">
                <span>{k.drugCount} drug tests</span>
                <span>{k.readTime.replace(" minutes", " min")} read</span>
                {k.drugs.some((d) => d.code === "ETG" || d.code === "ALC") && <span>Alcohol</span>}
                {k.validity && <span>Validity strip</span>}
              </div>
              <div className="acts">
                <Link href={`/get-a-quote?kit=${encodeURIComponent(k.code)}`} className="btn btn-primary">Get a quote</Link>
                <Link href={`/test-kits/${k.slug}`} className="btn btn-outline-dark">View details</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!shown.length && <p>No kits match those filters. <button type="button" className="chip" onClick={() => { setSpecimen("All"); setUse("All"); setDrug(""); }}>Clear filters</button></p>}
    </>
  );
}
