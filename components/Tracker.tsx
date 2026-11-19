"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// First-party page view tracking: records each page (including client-side navigation) and time on page.
const rid = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
function store(s: Storage | undefined, k: string) {
  try {
    if (!s) return rid();
    let v = s.getItem(k);
    if (!v) { v = rid(); s.setItem(k, v); }
    return v;
  } catch {
    return rid();
  }
}

export function Tracker() {
  const path = usePathname();
  const cur = useRef<{ id: number | null; start: number; s: string } | null>(null);

  useEffect(() => {
    if (!path || /^\/(admin|api)(\/|$)/.test(path) || navigator.webdriver) return;
    const v = store(typeof localStorage !== "undefined" ? localStorage : undefined, "labb_v");
    const s = store(typeof sessionStorage !== "undefined" ? sessionStorage : undefined, "labb_s");
    const q = new URLSearchParams(location.search);
    const state = { id: null as number | null, start: Date.now(), s, sent: false };
    cur.current = state;
    const send = () => {
      if (state.sent || !state.id) return;
      state.sent = true;
      const ms = Date.now() - state.start;
      const body = JSON.stringify({ t: "d", id: state.id, ms, s });
      if (!navigator.sendBeacon?.("/api/t", new Blob([body], { type: "application/json" }))) {
        fetch("/api/t", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
      }
    };
    // Wait a moment so the page title is set.
    const timer = setTimeout(() => {
      fetch("/api/t", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          t: "v", p: path, ti: document.title, r: document.referrer, v, s,
          us: q.get("utm_source"), um: q.get("utm_medium"), uc: q.get("utm_campaign"),
        }),
        keepalive: true,
      }).then((r) => (r.ok && r.status === 200 ? r.json() : null)).then((j) => { if (j?.id) state.id = j.id; }).catch(() => {});
    }, 300);
    const onHide = () => { if (document.visibilityState === "hidden") send(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", send);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", send);
      send();
    };
  }, [path]);

  return null;
}
