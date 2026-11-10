import Link from "next/link";
import { badgeLabel, type Kit } from "@/lib/kits";

// Drug-by-kit comparison grid. Cells show the cutoff (ng/mL) where a kit tests for that drug.
export function KitMatrix({ kits }: { kits: Kit[] }) {
  const names = new Map<string, string>();
  kits.forEach((k) => k.drugs.forEach((d) => names.has(d.code) || names.set(d.code, d.name.replace(/ \(.*\)$/, ""))));
  const codes = [...names.keys()].sort((a, b) => (names.get(a)! < names.get(b)! ? -1 : 1));

  return (
    <div className="compare-wrap">
      <table className="compare matrix">
        <caption className="visually-hidden">Drugs tested by each Labb kit, with cutoffs in ng/mL</caption>
        <thead>
          <tr>
            <th scope="col">Drug</th>
            {kits.map((k) => (
              <th key={k.slug} scope="col">
                <Link href={`/test-kits/${k.slug}`}>{k.code}</Link>
                <span className="sub">{k.specimen === "Urine" ? "Urine" : "Oral fluid"} · {badgeLabel[k.badge]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="group">
            <th scope="row">Drugs tested</th>
            {kits.map((k) => <td key={k.slug}><strong>{k.drugCount}</strong></td>)}
          </tr>
          {codes.map((c) => (
            <tr key={c}>
              <th scope="row">
                {names.get(c)} <span className="code">{c}</span>
              </th>
              {kits.map((k) => {
                const d = k.drugs.find((x) => x.code === c);
                return <td key={k.slug}>{d ? <span className="yes-cut">{d.cutoff}</span> : <span className="no">–</span>}</td>;
              })}
            </tr>
          ))}
          <tr>
            <th scope="row">Specimen validity</th>
            {kits.map((k) => <td key={k.slug}>{k.validity ? <span className="yes-cut">{k.validity.split(",").length} pads</span> : <span className="no">–</span>}</td>)}
          </tr>
          <tr>
            <th scope="row">Read time</th>
            {kits.map((k) => <td key={k.slug}>{k.readTime.replace(" minutes", " min")}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
