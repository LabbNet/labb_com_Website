import type { Metadata } from "next";
import { AdminBar, Flash } from "@/components/AdminBar";
import { fmtDate, readFlash, requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";
import { showDates, fmtDay, TS_STATUSES, tsStatusLabel, type TsRow, brochureLabel } from "@/lib/tradeShows";

export const metadata: Metadata = { title: "Trade Show Requests", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Row = TsRow & { name: string; clinic: string | null; email: string; prior: number };

export default async function AdminTradeShows({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdmin("/admin/trade-shows");
  const { show = "open" } = await searchParams;
  const filter = ["open", "all", "requested", "approved", "shipped", "declined"].includes(show) ? show : "open";
  const cols = `t.id, t.member_id, t.show_name, t.show_city, t.show_state, t.venue, t.show_url,
    to_char(t.start_date, 'YYYY-MM-DD') as start_date, to_char(t.end_date, 'YYYY-MM-DD') as end_date, t.brochures, t.brochure_items, t.banner_stands, t.other_items,
    t.ship_name, t.ship_line1, t.ship_line2, t.ship_city, t.ship_state, t.ship_zip, to_char(t.need_by, 'YYYY-MM-DD') as need_by, t.notes, t.status, t.admin_note, t.created_at`;
  const [rows, flash] = await Promise.all([
    sql().unsafe(
      `select ${cols}, m.name, m.clinic, m.email,
        (select count(*)::int from trade_show_requests x where x.member_id = t.member_id and x.status <> 'declined' and x.id <> t.id) as prior
       from trade_show_requests t join members m on m.id = t.member_id
       where ($1 = 'all' or ($1 = 'open' and t.status in ('requested', 'approved')) or t.status = $1)
       order by t.start_date asc, t.id desc`,
      [filter],
    ) as unknown as Promise<Row[]>,
    readFlash(),
  ]);

  return (
    <>
      <AdminBar title="Trade show requests" current="/admin/trade-shows" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <Flash flash={flash} />
          <form method="get" className="admin-search" style={{ maxWidth: 420 }}>
            <select name="show" defaultValue={filter} aria-label="Filter by status">
              <option value="open">Open (requested or approved)</option>
              <option value="all">All</option>
              {TS_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button className="btn btn-outline-dark" type="submit">Filter</button>
          </form>
          <div className="ts-list">
            {rows.map((r) => (
              <div key={r.id} className="hero-card ts-card">
                <div className="member-head">
                  <div>
                    <h2 className="form-title" style={{ marginBottom: 4 }}>{r.show_name}</h2>
                    <p className="muted" style={{ margin: 0 }}>
                      {r.venue ? `${r.venue}, ` : ""}{r.show_city}, {r.show_state} · {showDates(r)}
                      {r.show_url && <> · <a href={r.show_url} target="_blank" rel="noopener noreferrer">Show site</a></>}
                    </p>
                    <p style={{ margin: "6px 0 0" }}>
                      <strong>{r.clinic || r.name}</strong> · {r.name} · <a href={`mailto:${r.email}`}>{r.email}</a> · Requested {fmtDate(r.created_at)}
                    </p>
                  </div>
                  <span className={`status s-${r.status === "declined" ? "disabled" : r.status === "requested" ? "invited" : "active"}`}>{tsStatusLabel(r.status)}</span>
                </div>
                {r.prior > 0 && <div className="form-error" style={{ margin: "14px 0 0" }}>This member has {r.prior} other sponsored request{r.prior > 1 ? "s" : ""}. Limit is 1 sponsored show per member.</div>}
                <div className="ts-grid">
                  <div>
                    <span className="eyebrow">Items</span>
                    <ul>
                      {r.brochure_items?.length ? r.brochure_items.map((i) => <li key={i.item}>{i.qty} × {brochureLabel(i.item)}</li>) : r.brochures > 0 && <li>{r.brochures} brochures</li>}
                      {r.banner_stands && <li>1 set of pop-up banner stands</li>}
                      {r.other_items && <li>Other: {r.other_items}</li>}
                    </ul>
                  </div>
                  <div>
                    <span className="eyebrow">Ship to</span>
                    <p>{[r.ship_name, r.ship_line1, r.ship_line2].filter(Boolean).join(", ")}<br />{r.ship_city}, {r.ship_state} {r.ship_zip}</p>
                    {r.need_by && <p>Needed by {fmtDay(r.need_by)}</p>}
                  </div>
                  {r.notes && <div><span className="eyebrow">Notes</span><p>{r.notes}</p></div>}
                </div>
                <form action="/api/admin/trade-shows" method="post" className="ts-update">
                  <input type="hidden" name="id" value={r.id} />
                  <select name="status" defaultValue={r.status} aria-label="Status">
                    {TS_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <input name="admin_note" defaultValue={r.admin_note ?? ""} maxLength={500} placeholder="Note to the member (tracking number, what is covered)" aria-label="Note to the member" />
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
