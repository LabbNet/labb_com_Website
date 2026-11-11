"use client";

import { useEffect, useRef, useState } from "react";

// Scroll story: the graphic stays fixed while short steps scroll past; the graphic changes per step.
export function ScanStory({ steps }: { steps: { title: string; body: string; graphic: React.ReactNode }[] }) {
  const [cur, setCur] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setCur(Number((e.target as HTMLElement).dataset.i))),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  return (
    <div className="story">
      <div className="story-stage" aria-hidden="true">
        {steps.map((s, i) => (
          <div key={s.title} className={`story-frame${i === cur ? " on" : ""}`}>{s.graphic}</div>
        ))}
      </div>
      <ol className="story-steps">
        {steps.map((s, i) => (
          <li key={s.title} data-i={i} ref={(el) => { refs.current[i] = el; }} className={i === cur ? "on" : undefined}>
            <span className="story-n">{String(i + 1).padStart(2, "0")}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <div className="story-inline">{s.graphic}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
