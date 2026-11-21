import type { Metadata } from "next";
import Link from "next/link";
import { AdminBar } from "@/components/AdminBar";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { requireAdmin } from "@/lib/admin";
import { companies, identifiedShare, knownVisitors, breakdown, daily, entryPages, FORM_LABELS, formsByPage, formsByType, formTotals, kpis, live, liveCount, RANGES, signedIn, topPages, totalRows, type Kpis, type RangeKey } from "@/lib/analytics";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const num = (n: number) => n.toLocaleString("en-US");
const dur = (ms: number | null) => {
  if (!ms) return "None yet";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};
const ago = (d: Date) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 2) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
};

function Delta({ now, before, invert = false }: { now: number | null; before: number | null; invert?: boolean }) {
  if (now === null || before === null || before === 0) return <span className="an-delta">No earlier data</span>;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="an-delta">Same as before</span>;
  const good = invert ? pct < 0 : pct > 0;
  return <span className={`an-delta ${good ? "up" : "down"}`}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}% vs previous period</span>;
}

function Bars({ title, rows, unit = "visitors", empty }: { title: string; rows: { label: string; value: number; href?: string }[]; unit?: string; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="an-card">
      <h3>{title}</h3>
      {!rows.length ? <p className="fine">{empty}</p> : (
        <ul className="an-bars">
          {rows.map((r) => (
            <li key={r.label} title={`${r.label}: ${num(r.value)} ${unit}`}>
              <span className="an-bar" style={{ width: `${(r.value / max) * 100}%` }} />
              <span className="an-label">{r.href ? <a href={r.href} target="_blank" rel="noreferrer">{r.label}</a> : r.label}</span>
              <span className="an-val">{num(r.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function Analytics({ searchParams }: { searchParams: Promise<{ range?: string; staff?: string }> }) {
  await requireAdmin("/admin/analytics");
  const sp = await searchParams;
  const range = (sp.range && sp.range in RANGES ? sp.range : "30") as RangeKey;
  const f = { days: Number(range), staff: sp.staff === "1" };
  const [fNow, fPrev, fTypes, fPages] = await Promise.all([formTotals(f), formTotals(f, f.days), formsByType(f), formsByPage(f)]);
  const [orgs, known, share] = await Promise.all([companies(f), knownVisitors(f), identifiedShare(f)]);
  const lookupOn = Boolean(process.env.IPINFO_TOKEN);
  const [k, prev, series, pages, entries, refs, devices, browsers, oses, campaigns, users, now, total, liveN] = await Promise.all([
    kpis(f), kpis(f, f.days), daily(f), topPages(f), entryPages(f), breakdown(f, "referrer"), breakdown(f, "device"),
    breakdown(f, "browser"), breakdown(f, "os"), breakdown(f, "utm_campaign"), signedIn(f), live(), totalRows(), liveCount(),
  ]);
  const q = (r: string, s = f.staff) => `/admin/analytics?range=${r}${s ? "&staff=1" : ""}`;
  const tiles: { label: string; value: string; key: keyof Kpis; invert?: boolean }[] = [
    { label: "Visitors", value: num(k.visitors), key: "visitors" },
    { label: "Page views", value: num(k.views), key: "views" },
    { label: "Visits (sessions)", value: num(k.sessions), key: "sessions" },
    { label: "Pages per visit", value: k.sessions ? (k.views / k.sessions).toFixed(1) : "0", key: "views" },
    { label: "Avg. time on page", value: dur(k.avg_ms), key: "avg_ms" },
    { label: "Bounce rate", value: k.bounce === null ? "None yet" : `${k.bounce}%`, key: "bounce", invert: true },
  ];

  return (
    <>
      <AdminBar title="Analytics" current="/admin/analytics" />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <div className="an-filters">
            <nav className="an-range" aria-label="Date range">
              {(Object.keys(RANGES) as RangeKey[]).map((r) => (
                <Link key={r} href={q(r)} aria-current={r === range ? "true" : undefined}>{RANGES[r]}</Link>
              ))}
            </nav>
            <Link className="an-toggle" href={q(range, !f.staff)}>{f.staff ? "✓ Including" : "Excluding"} Labb admins</Link>
          </div>

          {total.n === 0 && (
            <div className="an-card an-empty">
              <strong>Tracking just started.</strong> Numbers fill in as people visit the site. Labb admins&apos; own visits are left out by default.
            </div>
          )}

          <div className="an-kpis">
            {tiles.map((t) => (
              <div key={t.label} className="an-kpi">
                <span className="an-kpi-label">{t.label}</span>
                <strong>{t.value}</strong>
                {t.label === "Pages per visit" ? (
                  <span className="an-delta">{num(k.returning)} returning visitors</span>
                ) : (
                  <Delta now={k[t.key] as number | null} before={prev[t.key] as number | null} invert={t.invert} />
                )}
              </div>
            ))}
          </div>

          <div className="an-card">
            <div className="an-card-head">
              <h3>Traffic by day</h3>
              <span className="fine">{RANGES[range]}, Eastern time</span>
            </div>
            <AnalyticsChart data={series} />
            <details className="an-table-view">
              <summary>Show as a table</summary>
              <table className="admin-table">
                <thead><tr><th scope="col">Day</th><th scope="col">Page views</th><th scope="col">Visitors</th></tr></thead>
                <tbody>{[...series].reverse().map((d) => <tr key={d.day}><td>{d.day}</td><td>{num(d.views)}</td><td>{num(d.visitors)}</td></tr>)}</tbody>
              </table>
            </details>
          </div>

          <div className="an-card" id="visitors">
            <div className="an-card-head">
              <h3>Who&apos;s visiting</h3>
              <span className="fine">{RANGES[range]}. {share.sessions ? `${Math.round((share.with_org / share.sessions) * 100)}% of visits matched to a company, ${Math.round((share.known / share.sessions) * 100)}% to a known person.` : ""}</span>
            </div>
            <div className="an-grid-2">
              <div className="an-card">
                <h3>Companies</h3>
                {!lookupOn && <p className="fine">Company lookup is off. Add an IPINFO_TOKEN in Render to name the companies behind visits.</p>}
                {lookupOn && !orgs.length && <p className="fine">No company visits matched in this range yet. Visits from home internet and mobile networks can&apos;t be matched to a company.</p>}
                {orgs.length > 0 && (
                  <div className="an-scroll">
                    <table className="admin-table">
                      <thead><tr><th scope="col">Company</th><th scope="col">Visits</th><th scope="col">Pages</th><th scope="col">Last seen</th></tr></thead>
                      <tbody>
                        {orgs.map((o) => (
                          <tr key={`${o.org}-${o.org_domain}`}>
                            <th scope="row">
                              {o.org}{o.pricing && <span className="status s-contacted" style={{ marginLeft: 6 }}>buying pages</span>}
                              <span className="bg-note">{o.org_domain || ""}{o.top_path ? ` · most viewed ${o.top_path}` : ""}</span>
                              {o.lead_id && <span className="bg-note">Lead: <Link href={`/admin/leads/${o.lead_id}`}>{o.lead_name}</Link></span>}
                            </th>
                            <td>{num(o.sessions)}</td><td>{num(o.views)}</td><td>{ago(o.last_seen)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="an-card">
                <h3>Known visitors</h3>
                {!known.length ? <p className="fine">People are recognized after they submit a form or click a link in a Labb email. None in this range yet.</p> : (
                  <div className="an-scroll">
                    <table className="admin-table">
                      <thead><tr><th scope="col">Person</th><th scope="col">Visits</th><th scope="col">Pages</th><th scope="col">Last seen</th></tr></thead>
                      <tbody>
                        {known.map((k) => (
                          <tr key={k.email}>
                            <th scope="row">
                              {k.lead_id ? <Link href={`/admin/leads/${k.lead_id}`}>{k.name || k.email}</Link> : k.name || k.email}
                              <span className="bg-note">{[k.company || k.org, k.top_path ? `most viewed ${k.top_path}` : null, k.source === "email" ? "via email" : null].filter(Boolean).join(" · ")}</span>
                            </th>
                            <td>{num(k.sessions)}</td><td>{num(k.views)}</td><td>{ago(k.last_seen)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="an-card" id="forms">
            <div className="an-card-head">
              <h3>Form completions</h3>
              <span className="fine">{RANGES[range]}. Every form submitted on the website, including Quick Test orders.</span>
            </div>
            <div className="an-kpis an-kpis-3">
              <div className="an-kpi">
                <span className="an-kpi-label">Forms completed</span>
                <strong>{num(fNow.forms)}</strong>
                <Delta now={fNow.forms} before={fPrev.forms} />
              </div>
              <div className="an-kpi">
                <span className="an-kpi-label">Leads (not newsletter)</span>
                <strong>{num(fNow.leads)}</strong>
                <Delta now={fNow.leads} before={fPrev.leads} />
              </div>
              <div className="an-kpi">
                <span className="an-kpi-label">Visitor conversion</span>
                <strong>{k.visitors ? `${Math.min(100, (fNow.leads / k.visitors) * 100).toFixed(1)}%` : "n/a"}</strong>
                <span className="fine" style={{ textAlign: "left" }}>Leads per 100 visitors</span>
              </div>
            </div>
            <div className="an-forms-grid">
              <Bars title="By form" rows={fTypes.map((t) => ({ label: FORM_LABELS[t.type] || t.type, value: t.n }))} unit="completed" empty="No forms completed in this range yet." />
              <div className="an-card">
                <h3>By page</h3>
                {!fPages.length ? <p className="fine">No forms completed in this range yet.</p> : (
                  <div className="an-scroll">
                    <table className="admin-table">
                      <thead><tr><th scope="col">Page</th><th scope="col">Completed</th><th scope="col">Visitors</th><th scope="col">Conversion</th></tr></thead>
                      <tbody>
                        {fPages.map((p) => (
                          <tr key={p.page}>
                            <th scope="row">{p.page.startsWith("/") ? <a href={p.page} target="_blank" rel="noreferrer">{p.page}</a> : "Not recorded"}</th>
                            <td>{num(p.n)}</td><td>{num(p.visitors)}</td>
                            <td>{p.visitors && p.page.startsWith("/") ? `${Math.min(100, (p.n / p.visitors) * 100).toFixed(1)}%` : "n/a"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <p className="fine" style={{ textAlign: "left", marginTop: 10 }}><a href="/admin/leads">Open the leads</a> to see each submission.</p>
          </div>

          <div className="an-grid-2">
            <div className="an-card an-wide">
              <h3>Pages</h3>
              {!pages.length ? <p className="fine">No page views in this range yet.</p> : (
                <div className="an-scroll">
                  <table className="admin-table an-pages">
                    <thead><tr><th scope="col">Page</th><th scope="col">Views</th><th scope="col">Visitors</th><th scope="col">Avg. time</th></tr></thead>
                    <tbody>
                      {pages.map((p) => (
                        <tr key={p.path}>
                          <th scope="row"><a href={p.path} target="_blank" rel="noreferrer">{p.path}</a>{p.title && <span className="sub">{p.title.replace(/ \| Labb$/, "")}</span>}</th>
                          <td>{num(p.views)}</td><td>{num(p.visitors)}</td><td>{dur(p.avg_ms)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="an-side">
              <div className="an-card an-live">
                <h3><span className="an-dot" aria-hidden="true" /> On the site now</h3>
                <p className="an-live-n"><strong>{num(liveN)}</strong> {liveN === 1 ? "visitor" : "visitors"} in the last 30 minutes</p>
                {now.length > 0 && <ul className="an-mini">{now.map((r) => <li key={r.path}><span>{r.path}</span><span>{r.visitors}</span></li>)}</ul>}
              </div>
              <Bars title="Where visitors start" rows={entries.map((e) => ({ label: e.path, value: e.sessions }))} unit="visits" empty="No visits yet." />
            </div>
          </div>

          <div className="an-grid-3">
            <Bars title="Sources" rows={refs.map((r) => ({ label: r.label, value: r.visitors }))} empty="No visits yet." />
            <Bars title="Campaigns (UTM)" rows={campaigns.map((r) => ({ label: r.label, value: r.visitors }))} empty="No tagged links used in this range." />
            <Bars title="Devices" rows={devices.map((r) => ({ label: r.label, value: r.visitors }))} empty="No visits yet." />
            <Bars title="Browsers" rows={browsers.map((r) => ({ label: r.label, value: r.visitors }))} empty="No visits yet." />
            <Bars title="Operating systems" rows={oses.map((r) => ({ label: r.label, value: r.visitors }))} empty="No visits yet." />
          </div>

          <div className="an-card">
            <div className="an-card-head">
              <h3>Signed-in users</h3>
              <span className="fine">{num(k.members)} CPP members and learners active in this range</span>
            </div>
            {!users.length ? <p className="fine">No signed-in activity in this range yet.</p> : (
              <div className="an-scroll">
                <table className="admin-table">
                  <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Page views</th><th scope="col">Visits</th><th scope="col">Used</th><th scope="col">Most viewed</th><th scope="col">Last seen</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <th scope="row">{u.name}{u.clinic && <span className="sub">{u.clinic}</span>}</th>
                        <td>{u.role === "member" ? "CPP member" : u.role === "learner" ? "Learner" : "Admin"}</td>
                        <td>{num(u.views)}</td><td>{num(u.sessions)}</td><td>{u.areas || "Public pages"}</td>
                        <td>{u.top_path}</td><td>{ago(u.last_seen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="fine" style={{ textAlign: "left" }}>
            First-party analytics: no third-party trackers. A visitor is one browser. Bots, admin pages and course screens aren&apos;t counted.
            {total.first ? ` Tracking since ${new Date(total.first).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.` : ""}
          </p>
        </div>
      </section>
    </>
  );
}
