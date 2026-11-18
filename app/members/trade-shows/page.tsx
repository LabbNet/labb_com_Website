import { site } from "@/lib/site";
import { Flash } from "@/components/AdminBar";
import { readFlash } from "@/lib/admin";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { showDates, TS_COLUMNS, TS_LIMIT_NOTE, tsStatusLabel, type TsRow, TS_BROCHURES, BROCHURE_LIMIT, brochureSummary } from "@/lib/tradeShows";

export const dynamic = "force-dynamic";

export default async function TradeShows() {
  const m = await currentMember();
  if (!m) return null; // layout redirects to sign in
  const [rows, flash] = await Promise.all([
    sql().unsafe(`select ${TS_COLUMNS} from trade_show_requests where member_id = $1 order by created_at desc`, [m.id]) as unknown as Promise<TsRow[]>,
    readFlash(),
  ]);
  const used = rows.some((r) => r.status !== "declined");

  return (
    <section className="section" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <Flash flash={flash} />
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", marginTop: 12 }}>Trade show requests</h1>
        <p className="lede">
          Attending a trade show? Request brochures, a banner stand set and other Labb materials. Send your request at least three weeks before the
          show so there is time to print and ship.
        </p>
        <p className="fine-print" style={{ maxWidth: 760 }}>{TS_LIMIT_NOTE}</p>
        {used && (
          <div className="form-error" role="note" style={{ marginTop: 16 }}>
            You already have a sponsored show on file. You can still send a request, and Labb will confirm what can be covered.
          </div>
        )}

        <div className="split" style={{ alignItems: "start", gridTemplateColumns: "1.3fr 1fr", marginTop: 28 }}>
          <form className="hero-card" action="/api/members/trade-shows" method="post">
            <h2 className="form-title">New request</h2>
            <div className="fields">
              <h3 className="form-group full">The show</h3>
              <div className="field full"><label htmlFor="t-name">Show name<span className="req">*</span></label><input id="t-name" name="show_name" required maxLength={160} /></div>
              <div className="field full"><label htmlFor="t-venue">Venue</label><input id="t-venue" name="venue" maxLength={160} placeholder="Convention center or hotel" /></div>
              <div className="field"><label htmlFor="t-city">City<span className="req">*</span></label><input id="t-city" name="show_city" required maxLength={80} /></div>
              <div className="field"><label htmlFor="t-state">State<span className="req">*</span></label><input id="t-state" name="show_state" required maxLength={40} /></div>
              <div className="field"><label htmlFor="t-start">Start date<span className="req">*</span></label><input id="t-start" name="start_date" type="date" required /></div>
              <div className="field"><label htmlFor="t-end">End date</label><input id="t-end" name="end_date" type="date" /></div>
              <div className="field full"><label htmlFor="t-url">Show website</label><input id="t-url" name="show_url" maxLength={300} placeholder="https://" /></div>

              <h3 className="form-group full">What you need</h3>
              <fieldset className="field full ts-brochures">
                <legend>Booklets and brochures <span className="fine">(up to {BROCHURE_LIMIT} total. Need more? Call Labb at <a href={site.phoneHref}>{site.phone}</a>.)</span></legend>
                {TS_BROCHURES.map((b) => (
                  <label key={b.value} className="ts-broch-row">
                    <span>{b.label}</span>
                    <input type="number" name={`broch_${b.value}`} min={0} max={BROCHURE_LIMIT} step={1} defaultValue={0} inputMode="numeric" aria-label={`${b.label} quantity`} />
                  </label>
                ))}
              </fieldset>
              <div className="field">
                <label htmlFor="t-banner">Pop-up banner stands</label>
                <select id="t-banner" name="banner_stands" defaultValue="yes">
                  <option value="yes">1 set</option>
                  <option value="no">None</option>
                </select>
              </div>
              <div className="field full">
                <label htmlFor="t-other">Other items</label>
                <textarea id="t-other" name="other_items" maxLength={1000} placeholder="Table cover, kit samples, giveaways, flyers for a specific industry" />
              </div>

              <h3 className="form-group full">Ship to</h3>
              <div className="field full"><label htmlFor="t-sname">Attention</label><input id="t-sname" name="ship_name" defaultValue={m.name} maxLength={120} /></div>
              <div className="field full"><label htmlFor="t-l1">Address<span className="req">*</span></label><input id="t-l1" name="ship_line1" required defaultValue={m.address_line1 ?? ""} maxLength={160} /></div>
              <div className="field full"><label htmlFor="t-l2">Address line 2</label><input id="t-l2" name="ship_line2" defaultValue={m.address_line2 ?? ""} maxLength={160} /></div>
              <div className="field"><label htmlFor="t-scity">City<span className="req">*</span></label><input id="t-scity" name="ship_city" required defaultValue={m.city ?? ""} maxLength={80} /></div>
              <div className="field"><label htmlFor="t-sstate">State<span className="req">*</span></label><input id="t-sstate" name="ship_state" required defaultValue={m.state ?? ""} maxLength={40} /></div>
              <div className="field"><label htmlFor="t-zip">ZIP<span className="req">*</span></label><input id="t-zip" name="ship_zip" required defaultValue={m.postal_code ?? ""} maxLength={12} /></div>
              <div className="field"><label htmlFor="t-need">Needed by</label><input id="t-need" name="need_by" type="date" /></div>
              <div className="field full"><label htmlFor="t-notes">Notes</label><textarea id="t-notes" name="notes" maxLength={2000} placeholder="Booth number, audience, anything Labb should know" /></div>
            </div>
            <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} type="submit">Send request</button>
          </form>

          <div className="hero-card">
            <h2 className="form-title">Your requests</h2>
            <ul className="contract-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <div>
                    <strong>{r.show_name}</strong>
                    <span className="sub">{r.show_city}, {r.show_state} · {showDates(r)}</span>
                    <span className="sub">
                      {[brochureSummary(r.brochure_items, r.brochures), r.banner_stands ? "Banner stands" : "", r.other_items ? "Other items" : ""].filter(Boolean).join(" · ")}
                    </span>
                    {r.admin_note && <span className="sub">Labb: {r.admin_note}</span>}
                  </div>
                  <span className={`status s-${r.status === "declined" ? "disabled" : r.status === "requested" ? "invited" : "active"}`}>{tsStatusLabel(r.status)}</span>
                </li>
              ))}
              {!rows.length && <li className="muted">No requests yet.</li>}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
