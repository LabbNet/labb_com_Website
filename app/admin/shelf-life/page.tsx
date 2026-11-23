import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { fmtDay, SLR_CLASS, SLR_STATUSES, slrStatusLabel, TRACKER_URL, type SlrRow } from "@/lib/shelfLife";

export const metadata: Metadata = { title: "Lot Extension Requests", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Row = SlrRow & { name: string; clinic: string | null; email: string };

export default async function AdminShelfLife({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdmin("/admin/shelf-life");
  const { show = "open" } = await searchParams;
  const filter = ["open", "all", ...SLR_STATUSES.map((s) => s.value)].includes(show) ? show : "open";
  const [rows, flash] = await Promise.all([
    sql().unsafe(
      `select r.id, r.kit, r.lot_number, to_char(r.printed_exp, 'YYYY-MM-DD') as printed_exp, r.quantity, to_char(r.need_by, 'YYYY-MM-DD') as need_by,
        r.notes, r.status, r.admin_note, r.created_at, r.updated_at, m.name, m.clinic, m.email
       from shelf_life_requests r join members m on m.id = r.member_id
       where ($1 = 'all' or ($1 = 'open' and r.status in ('requested', 'in_review')) or r.status = $1)
       order by r.need_by asc nulls last, r.id desc`,
      [filter],
    ) as unknown as Promise<Row[]>,
    readFlash(),
  ]);

  return (
    <>
      <AdminBar title="Lot extension requests" current="/admin/shelf-life" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <p className="form-sub" style={{ maxWidth: 760 }}>
            CPP members ask for a lot to be extended here. Run the control and record it in the{" "}
            <a href={`${TRACKER_URL}/admin.html`} target="_blank" rel="noopener">POCT tracker</a>, then set the request to Extended so the member sees it is done.
          </p>
          <form method="get" className="admin-search" style={{ maxWidth: 420 }}>
            <select name="show" defaultValue={filter} aria-label="Filter by status">
              <option value="open">Open (requested or control scheduled)</option>
              <option value="all">All</option>
              {SLR_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button className="btn btn-outline-dark" type="submit">Filter</button>
          </form>
          <div className="ts-list">
            {rows.map((r) => (
              <div key={r.id} className="hero-card ts-card">
                <div className="member-head">
                  <div>
                    <h2 className="form-title" style={{ marginBottom: 4 }}>{r.kit} · lot <span className="sl-mono">{r.lot_number}</span></h2>
                    <p style={{ margin: 0 }}>
                      <strong>{r.clinic || r.name}</strong> · {r.name} · <a href={`mailto:${r.email}`}>{r.email}</a> · Request #{r.id}, {fmtDate(r.created_at)}
                    </p>
                  </div>
                  <span className={`status ${SLR_CLASS[r.status] || "s-disabled"}`}>{slrStatusLabel(r.status)}</span>
                </div>
                <div className="ts-grid">
                  <div><span className="eyebrow">Printed expiration</span><p>{fmtDay(r.printed_exp)}</p></div>
                  <div><span className="eyebrow">Quantity on hand</span><p>{r.quantity || "Not given"}</p></div>
                  <div><span className="eyebrow">Needed by</span><p>{r.need_by ? fmtDay(r.need_by) : "Not specified"}</p></div>
                  {r.notes && <div><span className="eyebrow">Notes</span><p>{r.notes}</p></div>}
                </div>
                <form action="/api/admin/shelf-life" method="post" className="ts-update">
                  <input type="hidden" name="id" value={r.id} />
                  <select name="status" defaultValue={r.status} aria-label="Status">
                    {SLR_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <input name="admin_note" defaultValue={r.admin_note ?? ""} maxLength={500} placeholder="Note to the member (control date, new expiration, why not extended)" aria-label="Note to the member" />
                  <button className="btn btn-outline-dark" type="submit">Save</button>
                </form>
              </div>
            ))}
            {!rows.length && <p className="muted">No requests match.</p>}
          </div>
        </div>
      </section>
    </>
  );
}
