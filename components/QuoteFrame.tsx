"use client";
import { useEffect, useRef, useState } from "react";

// Shows quote HTML in a sandboxed frame (no scripts) and sizes it to its content.
export function QuoteFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState(900);
  useEffect(() => {
    const f = ref.current;
    if (!f) return;
    const fit = () => {
      try { const d = f.contentDocument; if (d?.body) setH(Math.max(400, d.documentElement.scrollHeight, d.body.scrollHeight) + 8); } catch { /* cross-origin */ }
    };
    f.addEventListener("load", fit);
    const t = setInterval(fit, 1000);
    return () => { f.removeEventListener("load", fit); clearInterval(t); };
  }, [html]);
  return <iframe ref={ref} title={title} srcDoc={/<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, "<head$1><base target=\"_blank\">") : `<base target="_blank">${html}`} sandbox="allow-same-origin allow-popups" className="quote-frame" style={{ height: h }} />;
}
