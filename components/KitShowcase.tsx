"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { badgeLabel, type Kit } from "@/lib/kits";

// Product showcase for /test-kits: large kit renders grouped by product line, with filters.
// Hovering a card shows a second angle when the kit has one.
const LINES: { series: Kit["series"]; title: string; blurb: string; href: string }[] = [
  { series: "ORF Series", title: "OraFlo", blurb: "Oral fluid with masked drug names that keep each donor's screen private.", href: "/test-kits/oraflo" },
  { series: "OR Series", title: "Oral eTest", blurb: "eTest Swab oral fluid devices. Observed collection, no restroom needed.", href: "/test-kits/oral-etest" },
  { series: "UA Series", title: "Urine eTest", blurb: "eTest Cup urine screens from 6 to 23 drugs, made for an objective Labb Station read.", href: "/test-kits/urine-etest" },
];
const tagClass = (b: Kit["badge"]) => (b === "FUO" ? "tag forensic" : b === "OTC" ? "tag diag" : "tag");
const title = (k: Kit) => k.name.replace(k.code, "").replace(/\s+/g, " ").trim();

export function KitShowcase({ kits }: { kits: Kit[] }) {
  const [specimen, setSpecimen] = useState<"All" | Kit["specimen"]>("All");
  const [use, setUse] = useState<"All" | Kit["badge"]>("All");
  const [drug, setDrug] = useState("");
  const drugs = useMemo(() => {
    const m = new Map<string, string>();
    kits.forEach((k) => k.drugs.forEach((d) => m.set(d.code, d.name)));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [kits]);
  const shown = kits.filter((k) => (specimen === "All" || k.specimen === specimen) && (use === "All" || k.badge === use) && (!drug || k.drugs.some((d) => d.code === drug)));
  const chip = <T extends string>(val: T, cur: T, set: (v: T) => void, label: string) => (
    <button type="button" className="chip" aria-pressed={cur === val} onClick={() => set(val)}>{label}</button>
  );
  const clear = () => { setSpecimen("All"); setUse("All"); setDrug(""); };

  return (
    <>
      <div className="ks-bar" role="group" aria-label="Filter kits">
        <div className="wrap ks-bar-in">
          <div className="grp"><span>Specimen</span>{chip("All", specimen, setSpecimen, "All")}{chip("Oral fluid", specimen, setSpecimen, "Oral fluid")}{chip("Urine", specimen, setSpecimen, "Urine")}</div>
          <div className="grp"><span>Use</span>{chip("All", use, setUse, "All")}{chip("EUO", use, setUse, "Workplace")}{chip("OTC", use, setUse, "FDA/OTC")}{chip("FUO", use, setUse, "Forensic")}</div>
          <div className="grp">
            <label htmlFor="ks-drug">Tests for</label>
            <select id="ks-drug" value={drug} onChange={(e) => setDrug(e.target.value)}>
              <option value="">Any drug</option>
              {drugs.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}
            </select>
          </div>
          <p className="ks-count" aria-live="polite">{shown.length} of {kits.length} kits</p>
        </div>
      </div>

      <div className="wrap">
        {LINES.map((line) => {
          const list = shown.filter((k) => k.series === line.series);
          if (!list.length) return null;
          return (
            <section key={line.series} className="ks-line" aria-labelledby={`ks-${line.series}`}>
              <div className="ks-line-head">
                <div>
                  <h2 id={`ks-${line.series}`}>{line.title}</h2>
                  <p>{line.blurb}</p>
                </div>
                <Link href={line.href} className="ks-line-link">About {line.title}</Link>
              </div>
              <div className="ks-grid">
                {list.map((k) => {
                  const alt = k.gallery?.[0];
                  return (
                    <Link key={k.slug} href={`/test-kits/${k.slug}`} className={`ks-card${alt ? " has-alt" : ""}`}>
                      <div className="ks-img">
                        <Image src={k.image} alt={`${k.name} ${k.specimen.toLowerCase()} drug test`} width={900} height={900} sizes="(max-width: 640px) 92vw, (max-width: 1000px) 46vw, 380px" className="ks-main" />
                        {alt && <Image src={alt.src} alt="" width={alt.w} height={alt.h} sizes="(max-width: 640px) 92vw, (max-width: 1000px) 46vw, 380px" className="ks-alt" />}
                        <span className={`${tagClass(k.badge)} ks-badge`}>{badgeLabel[k.badge]}</span>
                      </div>
                      <div className="ks-body">
                        <span className="ks-code">{k.code}</span>
                        <h3>{title(k)}</h3>
                        <p className="ks-specs">{k.specimen} · {k.drugCount} drugs · {k.readTime.replace(" minutes", " min")} read{k.drugs.some((d) => d.code === "ETG" || d.code === "ALC") ? " · Alcohol" : ""}</p>
                        <span className="ks-cta">View panel and cutoffs <span aria-hidden="true">→</span></span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
        {!shown.length && <p className="ks-empty">No kits match those filters. <button type="button" className="chip" onClick={clear}>Clear filters</button></p>}
      </div>
    </>
  );
}
