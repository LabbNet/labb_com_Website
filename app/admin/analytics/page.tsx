import type { Metadata } from "next";
import Link from "next/link";
import { AdminBar } from "@/components/AdminBar";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { requireAdmin } from "@/lib/admin";
import { breakdown, daily, entryPages, kpis, live, liveCount, RANGES, signedIn, topPages, totalRows, type Kpis, type RangeKey } from "@/lib/analytics";

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
