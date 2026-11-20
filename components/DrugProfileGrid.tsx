import Link from "next/link";
import { drugProfiles, levelClass } from "@/lib/drugProfiles";

// Grid of every Drug Profile Series page, used on /drugs and the training page.
export function DrugProfileGrid({ limit }: { limit?: number }) {
  const list = limit ? drugProfiles.slice(0, limit) : drugProfiles;
  return (
    <div className="drug-grid">
      {list.map((d) => (
        <Link key={d.slug} href={`/drugs/${d.slug}`} className="drug-card">
          <span className="dg-top">
            <span className="dg-no">No. {d.no}{d.assay ? ` · ${d.assay}` : ""}</span>
            <span className={`dg-index ${levelClass(d.level)}`} aria-label={`Priority index ${d.index} of 10`}>{d.index}</span>
          </span>
          <strong>{d.drug}</strong>
          <span className="dg-class">{d.kicker}</span>
        </Link>
      ))}
    </div>
  );
}
