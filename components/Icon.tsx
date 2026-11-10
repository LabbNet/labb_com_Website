// Simple line icons (generic shapes, stroke = currentColor).
const paths: Record<string, React.ReactNode> = {
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z M9 12l2 2 4-4" />,
  doc: <path d="M7 3h7l4 4v14H7z M14 3v4h4 M10 12h5 M10 16h5" />,
  eye: <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z" />,
  lock: <path d="M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 017 0v3" />,
  box: <path d="M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7 M12 11v10" />,
  check: <path d="M4 4h16v16H4z M8 12l3 3 5-6" />,
  chart: <path d="M4 20V4 M4 20h16 M8 16v-4 M12 16V8 M16 16v-6" />,
  phone: <path d="M8 2h8a1 1 0 011 1v18a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1z M11 18h2" />,
  users: <path d="M9 11a3 3 0 100-6 3 3 0 000 6z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M16 11a3 3 0 100-6 M18 14c2 .7 3 2.8 3 6" />,
  flask: <path d="M9 3h6 M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3 M7 15h10" />,
};

export function Icon({ name, size = 24 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
