import Link from "next/link";
import { badgeLabel, drugClasses, type Kit } from "@/lib/kits";

// Drugs and cutoffs by kit, grouped by drug class (draft theme layout).
export function KitMatrix({ kits }: { kits: Kit[] }) {
  const names = new Map<string, string>();
  kits.forEach((k) => k.drugs.forEach((d) => names.has(d.code) || names.set(d.code, d.name)));

  return (
    <div className="compare-wrap">
      <table className="compare matrix">
        <caption className="visually-hidden">Drugs tested by each Labb kit, with cutoffs in ng/mL</caption>
        <thead>
          <tr>
            <th scope="col" colSpan={2} style={{ textAlign: "left" }}>Drug</th>
            {kits.map((k) => (
              <th key={k.slug} scope="col">
                <Link href={`/test-kits/${k.slug}`}>{k.code}</Link>
                <span className="sub">{k.specimen}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="use">
            <th scope="row" colSpan={2}>Use</th>
            {kits.map((k) => <td key={k.slug}>{badgeLabel[k.badge]}</td>)}
          </tr>
        </tbody>
        {drugClasses.map((g) => {
          const codes = g.codes.filter((c) => names.has(c));
          if (!codes.length) return null;
          return (
            <tbody key={g.name}>
              <tr className="group"><th scope="rowgroup" colSpan={kits.length + 2} style={{ textAlign: "left" }}>{g.name}</th></tr>
              {codes.map((c) => (
                <tr key={c}>
                  <td className="codecol">{c}</td>
                  <th scope="row">{names.get(c)}</th>
                  {kits.map((k) => {
                    const d = k.drugs.find((x) => x.code === c);
                    return d ? <td key={k.slug} className="on"><span className="yes-cut">{d.cutoff}</span></td> : <td key={k.slug}><span className="no">·</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          );
        })}
        <tbody>
          <tr className="group"><th scope="rowgroup" colSpan={kits.length + 2} style={{ textAlign: "left" }}>Device</th></tr>
          <tr>
            <td className="codecol" />
            <th scope="row">Drugs tested</th>
            {kits.map((k) => <td key={k.slug}><strong>{k.drugCount}</strong></td>)}
          </tr>
          <tr>
            <td className="codecol">SVT</td>
            <th scope="row">Specimen validity</th>
            {kits.map((k) => <td key={k.slug} className={k.validity ? "on" : ""}>{k.validity ? `${k.validity.split(",").length} pads` : <span className="no">·</span>}</td>)}
          </tr>
          <tr>
            <td className="codecol" />
            <th scope="row">Read time</th>
            {kits.map((k) => <td key={k.slug}>{k.readTime.replace(" minutes", " min")}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
