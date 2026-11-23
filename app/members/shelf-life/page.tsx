import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentMember } from "@/lib/auth";
import { certificateUrl, fmtDay, fmtExtension, loadShelfLife, STATUS_CLASS } from "@/lib/shelfLife";

export const metadata: Metadata = { title: "Shelf-Life Tracker", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_HELP: [string, string][] = [
  ["Active", "Within its original 24-month expiration."],
  ["Extended", "Passed quality control. The expiration shown is the verified, extended date."],
  ["Control Due", "Expires within 14 days. Another passing control is needed to extend it."],
  ["Verification Failed", "The most recent control failed. Do not use this lot."],
  ["Expired", "Past its current expiration. Do not use this lot."],
];

export default async function ShelfLife({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const m = await currentMember();
  if (!m) return null; // layout redirects to sign in
  if (!m.shelf_life_tracker && m.role !== "admin") notFound();

  const q = String((await searchParams).q || "").trim().slice(0, 80);
  const { lots, config, error } = await loadShelfLife();
  const needle = q.toLowerCase();
  const shown = needle
    ? lots.filter((l) => l.lotNumber.toLowerCase().includes(needle) || l.poctName.toLowerCase().includes(needle))
    : lots;
  const count = (s: string) => lots.filter((l) => l.status === s).length;
  const maxMonths = Math.round(config.maxExtensionDays / 30.4);

  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", marginTop: 12 }}>Shelf-Life Tracker</h1>
        <p className="lede" style={{ maxWidth: 760 }}>
          Check whether a lot of Labb rapid tests is still good to use. Look up the lot number on the box to see its verified expiration date.
        </p>

        <div className="grid g3 sl-explain" style={{ marginTop: 28 }}>
          <div className="card rail">
            <span className="eyebrow">Shipped</span>
            <h3>24-month expiration</h3>
            <p>Every Labb rapid point-of-care test (POCT) lot ships with a 24-month expiration date printed on the box.</p>
          </div>
          <div className="card rail">
            <span className="eyebrow">Quality control</span>
            <h3>{config.extensionDaysPerControl} days per passing control</h3>
            <p>When a lot nears expiration, Labb runs quality controls on it. Each passing control extends the expiration to {config.extensionDaysPerControl} days after the control date.</p>
          </div>
          <div className="card rail">
            <span className="eyebrow">Limit</span>
            <h3>Up to {maxMonths === 12 ? "one extra year" : `${maxMonths} extra months`}</h3>
            <p>Controls can be repeated, but a lot can never be extended more than {config.maxExtensionDays} days past its original expiration.</p>
          </div>
        </div>
        <p className="fine-print" style={{ maxWidth: 760 }}>
          Only the expiration shown here is valid for an extended lot. The date printed on the box is the original expiration. Download the certificate to keep on file with your records.
        </p>

        <div className="sl-toolbar">
          <form method="get" className="sl-search" role="search">
            <label htmlFor="sl-q" className="sr-only">Lot number or test name</label>
            <input id="sl-q" name="q" type="search" defaultValue={q} placeholder="Lot number or test name" maxLength={80} />
            <button className="btn btn-primary" type="submit">Look up</button>
            {q && <a href="/members/shelf-life" className="linkish">Clear</a>}
          </form>
          {!error && lots.length > 0 && (
            <div className="sl-counts" aria-label="Lot summary">
              <span><strong>{lots.length}</strong> lots</span>
              <span><strong>{count("Extended")}</strong> extended</span>
              <span><strong>{count("Control Due")}</strong> control due</span>
              <span><strong>{count("Expired") + count("Verification Failed")}</strong> do not use</span>
            </div>
          )}
        </div>

        {error ? (
          <div className="form-error" role="alert">
            The Shelf-Life Tracker can&apos;t be reached right now. Try again in a few minutes. If you need a lot checked today, contact Labb.
          </div>
        ) : (
          <div className="compare-wrap">
            <table className="compare admin-table sl-table">
              <thead>
                <tr>
                  <th scope="col">Test</th>
                  <th scope="col">Lot #</th>
                  <th scope="col">Printed expiration</th>
                  <th scope="col">Verified expiration</th>
                  <th scope="col">Extension</th>
                  <th scope="col">Days left</th>
                  <th scope="col">Status</th>
                  <th scope="col">Certificate</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.id}>
                    <th scope="row">
                      {l.poctName}
                      {l.controls.length > 0 && (
                        <details className="sl-controls">
                          <summary>{l.controls.length} control{l.controls.length === 1 ? "" : "s"}</summary>
                          <ul>
                            {l.controls.map((c, i) => (
                              <li key={i}>
                                {fmtDay(c.dateConducted)}: <span className={c.outcome === "Pass" ? "sl-pass" : "sl-fail"}>{c.outcome === "Pass" ? "Passed" : "Failed"}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </th>
                    <td className="sl-mono">{l.lotNumber}</td>
                    <td>{fmtDay(l.originalExpiration)}</td>
                    <td><strong>{fmtDay(l.currentExpiration)}</strong></td>
                    <td>{fmtExtension(l.extensionDays)}{l.atExtensionCap && <span className="sub">At the 1-year limit</span>}</td>
                    <td>{l.daysRemaining === null ? "" : l.daysRemaining < 0 ? "0" : l.daysRemaining}</td>
                    <td><span className={`status ${STATUS_CLASS[l.status] || "s-disabled"}`}>{l.status}</span></td>
                    <td><a href={certificateUrl(l.id)} target="_blank" rel="noopener">PDF</a></td>
                  </tr>
                ))}
                {!shown.length && (
                  <tr>
                    <td colSpan={8} className="muted" style={{ textAlign: "center", padding: 28 }}>
                      {q ? <>No lot matches &ldquo;{q}&rdquo;. Check the lot number on the box. If the lot isn&apos;t listed, it has not been extended and the printed date applies.</>
                         : <>No lots have been extended yet. Until a lot is listed here, the expiration printed on the box applies.</>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="card" style={{ marginTop: 28 }}>
          <h3>What each status means</h3>
          <ul className="sl-legend">
            {STATUS_HELP.map(([s, d]) => (
              <li key={s}><span className={`status ${STATUS_CLASS[s]}`}>{s}</span> {d}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
