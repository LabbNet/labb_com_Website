"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LeadForm } from "@/components/LeadForm";
import type { Segment } from "@/lib/segments";
import { openConnect, type ConnectDetail } from "./connect";

// Slide-in lead form. Mounted once in the layout; any ConnectButton opens it with a topic,
// so the lead record shows exactly which detail brought the visitor in.
export function ConnectDrawer() {
  const [d, setD] = useState<ConnectDetail | null>(null);
  const [n, setN] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const on = (e: Event) => {
      setD((e as CustomEvent<ConnectDetail>).detail);
      setN((x) => x + 1);
    };
    window.addEventListener("labb:connect", on);
    return () => window.removeEventListener("labb:connect", on);
  }, []);
  useEffect(() => setD(null), [pathname]);
  useEffect(() => {
    if (!d) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setD(null);
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [d]);

  if (!d) return null;
  return (
    <div className="drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && setD(null)}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label={d.title || "Connect with Labb"} tabIndex={-1} ref={panel}>
        <button type="button" className="drawer-x" aria-label="Close" onClick={() => setD(null)}>×</button>
        <p className="drawer-topic">About: {d.topic}</p>
        <LeadForm
          key={n}
          variant="demo"
          segment={d.segment as Segment | undefined}
          products={d.products}
          topic={d.topic}
          title={d.title || "Connect with Labb"}
          subtitle="Tell us your testing goals. A Labb support team will build a program around them."
          submitLabel="Send"
        />
      </div>
    </div>
  );
}

export function ConnectButton({ topic, segment, products, label = "Talk to us", className = "reveal-link", title }: ConnectDetail & { label?: string; className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => openConnect({ topic, segment, products, title })}
    >
      {label} <span aria-hidden="true">→</span>
    </button>
  );
}
