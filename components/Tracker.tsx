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
    if (!path || /^\/(admin|api|reads)(\/|$)/.test(path) || navigator.webdriver) return;
    const v = store(typeof localStorage !== "undefined" ? localStorage : undefined, "labb_v");
    const s = store(typeof sessionStorage !== "undefined" ? sessionStorage : undefined, "labb_s");
    const q = new URLSearchParams(location.search);
    // First-party cookie with the same id, so forms can link this browser to the person who submits them.
    try { document.cookie = `labb_v=${v}; path=/; max-age=63072000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`; } catch {}
    // A Labb email link carries "lk" to recognize the reader. Take it out of the address bar so it isn't shared.
    const lk = q.get("lk");
    if (lk) {
      const u = new URL(location.href);
      u.searchParams.delete("lk");
      history.replaceState(history.state, "", u.pathname + u.search + u.hash);
    }
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
          us: q.get("utm_source"), um: q.get("utm_medium"), uc: q.get("utm_campaign"), k: lk,
        }),
        keepalive: true,
      }).then((r) => (r.ok && r.status === 200 ? r.json() : null)).then((j) => { if (j?.id) state.id = j.id; }).catch(() => {});
    }, 300);
    // Login clicks: mark this visit as an existing customer's so Analytics can separate it from prospects.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[data-login]");
      if (!a) return;
      const body = JSON.stringify({ t: "l", k: a.getAttribute("data-login"), s, v });
      if (!navigator.sendBeacon?.("/api/t", new Blob([body], { type: "application/json" }))) {
        fetch("/api/t", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
      }
    };
    document.addEventListener("click", onClick, true);
    const onHide = () => { if (document.visibilityState === "hidden") send(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", send);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", send);
      send();
    };
  }, [path]);

  return null;
}
