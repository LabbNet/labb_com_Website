"use client";
import { useState } from "react";

// A link field with a Copy button.
export function CopyLink({ url, label }: { url: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="copy-row">
      <input readOnly value={url} aria-label={label} className="copy-link" onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="btn btn-outline-dark btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* select instead */ } }}>
        {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
