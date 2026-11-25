"use client";
import { useEffect, useRef, useState } from "react";

// Shows a quote in a frame that can't run scripts, sized to its content.
// Pass src (a labb.com page, most reliable) or html.
export function QuoteFrame({ html, src, title }: { html?: string; src?: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState(1100);
  useEffect(() => {
    const f = ref.current;
    if (!f) return;
    const fit = () => {
      try { const d = f.contentDocument; if (d?.body) setH(Math.max(400, d.documentElement.scrollHeight, d.body.scrollHeight) + 8); } catch { /* not readable */ }
    };
    f.addEventListener("load", fit);
    const t = setInterval(fit, 1000);
    return () => { f.removeEventListener("load", fit); clearInterval(t); };
  }, [html, src]);
  const doc = html === undefined ? undefined : /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, '<head$1><base target="_blank">') : `<base target="_blank">${html}`;
  return <iframe ref={ref} title={title} src={src} srcDoc={doc} sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" className="quote-frame" style={{ height: h }} />;
}
