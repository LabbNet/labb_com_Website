import Link from "next/link";
import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { openDupes } from "@/lib/dupes";
import { segmentLabel, statusLabel } from "@/lib/segments";

export const metadata: Metadata = { title: "Possible duplicate leads", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Leads that look like the same person or organization under a different email or spelling, grouped.
export default async function Duplicates() {
  await requireAdmin("/admin/leads/duplicates");
  const [groups, flash] = await Promise.all([openDupes(60), readFlash()]);
  return (
    <>
      <AdminBar title="Possible duplicates" current="/admin/leads" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <p style={{ marginTop: 0 }}><Link href="/admin/leads">← All leads</Link></p>
          <Flash flash={flash} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.8rem", margin: "0 0 6px" }}>Possible duplicate leads ({groups.length})</h1>
            <form action="/api/admin/leads/dupes" method="post"><input type="hidden" name="action" value="scan" /><button className="linkish" type="submit">Check all leads again</button></form>
          </div>
          <p style={{ marginTop: 0 }}>These leads share a phone number, an email name, a company, or a name spelled or sounding nearly the same (Nevers and Neavers), under different emails. Repeat forms from the same email are combined automatically. Pick the lead to keep, check the ones that are the same person or organization, and merge, so only one rep works it. Or mark the group as different.</p>
          {!groups.length && <div className="hero-card"><p style={{ margin: 0 }}>Nothing to review. New leads are checked as they come in, and all leads every hour.</p></div>}
          {groups.map((g) => {
            const why = (id: string) => [...new Set(g.links.filter((l) => l.a === id || l.b === id).flatMap((l) => l.reasons))].join(" · ");
            return (
              <form key={g.key} action="/api/admin/leads/dupes" method="post" className="hero-card dd-pair">
                <div className="dd-head">
                  <span className={`dd-score ${g.score >= 80 ? "hi" : ""}`}>{g.score >= 80 ? "Likely the same" : "Possibly the same"} · {g.leads.length} leads</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="meet-table dd-table">
                    <thead><tr><th>Keep</th><th>Merge</th><th>Lead</th><th>Contact</th><th>Company</th><th>Owner and status</th><th>Why it matched</th></tr></thead>
                    <tbody>
                      {g.leads.map((l, i) => {
                        const id = String(l.id);
                        return (
                          <tr key={id}>
                            <td><input type="hidden" name="lead" value={id} /><input type="radio" name="keep" value={id} defaultChecked={i === 0} aria-label={`Keep lead ${id}`} /></td>
                            <td><input type="checkbox" name="merge" value={id} defaultChecked={i > 0 && g.score >= 80} aria-label={`Merge lead ${id}`} /></td>
                            <td><Link href={`/admin/leads/${id}`}>#{id} {[l.first_name, l.last_name].filter(Boolean).join(" ") || "(no name)"}</Link><br /><span className="fine">{segmentLabel(l.segment)} · {l.type.replace(/-/g, " ")} · {fmtDate(l.created_at)}</span></td>
                            <td>{l.email}{l.phone && <><br /><span className="fine">{l.phone}</span></>}</td>
                            <td>{l.company}{(l.city || l.state) && <><br /><span className="fine">{[l.city, l.state].filter(Boolean).join(", ")}</span></>}</td>
                            <td>{l.owner === "partner" ? `CPP: ${l.partner}` : "Labb"}<br /><span className="fine">{statusLabel(l.status as never)}{l.existing_client ? " · existing client" : ""}{l.meetings ? ` · ${l.meetings} meetings` : ""}</span></td>
                            <td className="fine">{why(id)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="dd-actions">
                  <button className="btn btn-primary btn-sm" type="submit" name="action" value="merge">Merge checked into the kept lead</button>
                  <button className="btn btn-outline-dark btn-sm" type="submit" name="action" value="dismiss">Not duplicates</button>
                </div>
              </form>
            );
          })}
        </div>
      </section>
    </>
  );
}
