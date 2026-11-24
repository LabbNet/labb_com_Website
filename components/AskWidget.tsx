"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Floating "Ask an Expert" button, bottom right on public pages. Opens a small panel that posts to /api/ask
// (the same flow as the Ask an Expert page: instant answer when Labb's content covers it, otherwise reviewed).
const HIDE = ["/admin", "/members", "/reads", "/learn", "/ask", "/meet", "/schedule", "/login", "/admin-login", "/forgot-password", "/reset-password", "/contract", "/account"];

export function AskWidget() {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector("textarea")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (HIDE.some((p) => path === p || path.startsWith(`${p}/`))) return null;

  return (
    <div className={`askw${open ? " open" : ""}`}>
      {open && (
        <div className="askw-panel" ref={panel} role="dialog" aria-modal="false" aria-labelledby="askw-title">
          <div className="askw-head">
            <div>
              <strong id="askw-title">Ask an Expert</strong>
              <span>Drug testing questions, answered from the Labb guidebooks</span>
            </div>
            <button type="button" className="askw-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <form action="/api/ask" method="post" onSubmit={() => setBusy(true)}>
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <label htmlFor="askw-q" className="sr-only">Your question</label>
            <textarea id="askw-q" name="question" required minLength={8} maxLength={1000} rows={4} placeholder="Ask about kits, drug panels, cutoffs, policies, collection or background checks" />
            <label htmlFor="askw-e" className="sr-only">Email</label>
            <input id="askw-e" name="email" type="email" required maxLength={200} autoComplete="email" placeholder="Your email (we'll send you the answer)" />
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Finding your answer..." : "Ask"}</button>
            <p className="askw-fine">Most answers appear right away. <a href="/ask">See answered questions</a></p>
          </form>
        </div>
      )}
      <button ref={button} type="button" className="askw-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close Ask an Expert" : "Ask an Expert"}>
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.4M12 16.6h.01" /></svg>
            <span>Ask an Expert</span>
          </>
        )}
      </button>
    </div>
  );
}
