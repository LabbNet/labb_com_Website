import Link from "next/link";
import { drugProfiles } from "@/lib/drugProfiles";
import { PriorityGauge } from "@/components/PriorityGauge";

// Grid of every Drug Profile Series page, used on /drugs and the training page.
export function DrugProfileGrid({ limit }: { limit?: number }) {
  const list = limit ? drugProfiles.slice(0, limit) : drugProfiles;
  return (
    <div className="drug-grid">
      {list.map((d) => (
        <Link key={d.slug} href={`/drugs/${d.slug}`} className="drug-card">
          <span className="dg-top">
            <span className="dg-no">No. {d.no}{d.assay ? ` · ${d.assay}` : ""}</span>
            <span className="dg-gauge" title="Labb Screening Priority Index" aria-label={`Screening priority ${d.index} of 10, ${d.level.toLowerCase()}`}>
              <PriorityGauge index={d.index} size={46} />
              <span><b>{d.index}</b>/10</span>
            </span>
          </span>
          <strong>{d.drug}</strong>
          <span className="dg-class">{d.kicker}</span>
        </Link>
      ))}
    </div>
  );
}
