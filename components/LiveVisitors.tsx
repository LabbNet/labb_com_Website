"use client";
import { useEffect, useState } from "react";
import type { LiveData } from "@/lib/analytics";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const hourLabel = (h: number) => (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`);

// Live visitors: now, last 30 minutes and today so far. Refreshes every 15 seconds while the tab is open.
export function LiveVisitors({ initial }: { initial: LiveData }) {
  const [d, setD] = useState(initial);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    let off = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/admin/analytics/live", { cache: "no-store" });
        if (!r.ok) throw new Error();
        const j = (await r.json()) as LiveData;
        if (!off) { setD(j); setStale(false); }
      } catch { if (!off) setStale(true); }
    };
    const t = setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    return () => { off = true; clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const max = Math.max(1, ...d.hours.map((h) => h.visitors));
  const diff = d.today - d.yesterdaySoFar;
  return (
    <div className="an-card lv">
      <div className="an-card-head">
        <h3><span className="an-dot" aria-hidden="true" /> Live</h3>
        <span className="fine">{stale ? "Reconnecting…" : `Updated ${time(d.at)} ET · refreshes every 15 seconds`}</span>
      </div>
      <div className="lv-tiles">
        <div className="lv-tile lv-big"><span>On the site right now</span><strong>{d.now}</strong><em>active in the last 5 minutes</em></div>
        <div className="lv-tile"><span>Last 30 minutes</span><strong>{d.last30}</strong><em>visitors</em></div>
        <div className="lv-tile"><span>Visitors today</span><strong>{d.today.toLocaleString()}</strong>
          <em>{diff === 0 ? "same as" : `${Math.abs(diff)} ${diff > 0 ? "more than" : "fewer than"}`} yesterday by this time</em></div>
        <div className="lv-tile"><span>Page views today</span><strong>{d.todayViews.toLocaleString()}</strong><em>since midnight ET</em></div>
      </div>
      <div className="lv-hours" role="img" aria-label="Visitors by hour today">
        {d.hours.map((h) => (
          <div key={h.hour} className="lv-hour" title={`${hourLabel(h.hour)}: ${h.visitors} visitors, ${h.views} page views`}>
            <div className="lv-bar" style={{ height: `${Math.max(h.visitors ? 4 : 0, (h.visitors / max) * 100)}%` }} />
            <span>{h.hour % 3 === 0 ? hourLabel(h.hour) : ""}</span>
          </div>
        ))}
      </div>
      <div className="lv-cols">
        <div>
          <h4>Pages being viewed now</h4>
          {d.pages.length ? <ul className="an-mini">{d.pages.map((p) => <li key={p.path}><span title={p.title ?? p.path}>{p.path}</span><span>{p.visitors}</span></li>)}</ul> : <p className="fine">Nobody on the site right now.</p>}
        </div>
        <div>
          <h4>Where today&apos;s visitors came from</h4>
          {d.sources.length ? <ul className="an-mini">{d.sources.map((s) => <li key={s.label}><span>{s.label}</span><span>{s.visitors}</span></li>)}</ul> : <p className="fine">No visits yet today.</p>}
        </div>
        <div>
          <h4>Latest page views</h4>
          {d.recent.length ? <ul className="an-mini lv-recent">{d.recent.map((r, i) => <li key={i}><span>{r.path}<em>{[r.region, r.device].filter(Boolean).join(" · ")}</em></span><span>{time(r.ts)}</span></li>)}</ul> : <p className="fine">None in the last 30 minutes.</p>}
        </div>
      </div>
    </div>
  );
}
