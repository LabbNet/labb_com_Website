import { redirect } from "next/navigation";
import { Flash } from "@/components/AdminBar";
import { readFlash } from "@/lib/admin";
import { etParts, fmtDay, fmtTime, hrs, pending, requireReads } from "@/lib/reads";

// Schedule requests and pay card changes waiting for the approver.
export default async function ReadsApprovals() {
  const a = await requireReads("/reads/approvals");
  if (!a.approver && !a.superRead) redirect("/reads");
  const [p, flash] = await Promise.all([pending(), readFlash()]);
  const when = (s: Date, e: Date) => `${fmtDay(etParts(new Date(s)).date)}, ${fmtTime(s)} to ${fmtTime(e)}`;
  const h = (s: Date, e: Date) => hrs((new Date(e).getTime() - new Date(s).getTime()) / 3600_000);

  return (
    <section className="section" style={{ paddingTop: 28 }}>
      <div className="wrap">
        <Flash flash={flash} />
        {!a.approver && <p className="fine" style={{ textAlign: "left" }}>Angela Ramsey approves these. You can see what&apos;s waiting.</p>}

        <h2 className="crm-h2">Schedule requests</h2>
        {!p.shifts.length ? <p className="hero-card">No schedule requests waiting.</p> : (
          <form action="/api/reads" method="post">
            <input type="hidden" name="back" value="/reads/approvals" />
            <div className="bg-table-wrap">
              <table className="bg-table">
                <thead><tr>{a.approver && <th scope="col"><span className="sr-only">Select</span></th>}<th scope="col">Read admin</th><th scope="col">Request</th><th scope="col">Hours</th><th scope="col">Note</th></tr></thead>
                <tbody>
                  {p.shifts.map((s) => (
                    <tr key={s.id}>
                      {a.approver && <td><input type="checkbox" name="id" value={s.id} defaultChecked aria-label={`Select request from ${s.name}`} /></td>}
                      <th scope="row">{s.name}{s.requested_by_name && s.requested_by_name !== s.name ? <span className="bg-note">by {s.requested_by_name}</span> : null}</th>
                      <td>
                        {s.action === "add" && <>New shift: {when(s.starts_at, s.ends_at)}</>}
                        {s.action === "change" && <>Change {s.old_starts && s.old_ends ? when(s.old_starts, s.old_ends) : "a shift"} <strong>to</strong> {when(s.starts_at, s.ends_at)}</>}
                        {s.action === "remove" && <>Remove shift: {when(s.starts_at, s.ends_at)}</>}
                      </td>
                      <td>{s.action === "remove" ? `-${h(s.starts_at, s.ends_at)}` : h(s.starts_at, s.ends_at)}</td>
                      <td>{s.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {a.approver && (
              <div className="ct-assign" style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" type="submit" name="action" value="approve">Approve checked</button>
                <button className="linkish" type="submit" name="action" value="decline">Decline checked</button>
              </div>
            )}
          </form>
        )}

        <h2 className="crm-h2">Pay card changes</h2>
        <p className="fine" style={{ textAlign: "left", marginTop: -4 }}>Hours that differ from the schedule. They count toward pay only once approved.</p>
        {!p.adjustments.length ? <p className="hero-card">No hour changes waiting.</p> : (
          <form action="/api/reads" method="post">
            <input type="hidden" name="back" value="/reads/approvals" />
            <div className="bg-table-wrap">
              <table className="bg-table">
                <thead><tr>{a.approver && <th scope="col"><span className="sr-only">Select</span></th>}<th scope="col">Read admin</th><th scope="col">Date</th><th scope="col">Hours</th><th scope="col">Reason</th></tr></thead>
                <tbody>
                  {p.adjustments.map((x) => (
                    <tr key={x.id}>
                      {a.approver && <td><input type="checkbox" name="id" value={x.id} defaultChecked aria-label={`Select change for ${x.name}`} /></td>}
                      <th scope="row">{x.name}</th>
                      <td>{fmtDay(new Date(x.work_date).toISOString().slice(0, 10))}</td>
                      <td>{Number(x.hours) > 0 ? "+" : ""}{hrs(Number(x.hours))}</td>
                      <td>{x.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {a.approver && (
              <div className="ct-assign" style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" type="submit" name="action" value="adj-approve">Approve checked</button>
                <button className="linkish" type="submit" name="action" value="adj-decline">Decline checked</button>
              </div>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
