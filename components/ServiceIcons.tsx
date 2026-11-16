// Line icons for the home page services grid. Stroke uses currentColor so the colour comes from CSS.
const common = {
  width: 56,
  height: 56,
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconSoftware() {
  // Browser window with an automated checklist
  return (
    <svg {...common}>
      <rect x="5" y="8" width="38" height="30" rx="4" />
      <path d="M5 15h38" />
      <circle cx="10" cy="11.5" r="0.8" fill="currentColor" />
      <circle cx="13.5" cy="11.5" r="0.8" fill="currentColor" />
      <path d="M11 22l2 2 3.5-3.5M11 30l2 2 3.5-3.5" />
      <path d="M21 22.5h15M21 30.5h11" />
      <path d="M18 42h12" />
    </svg>
  );
}

export function IconReader() {
  // Phone with scan corners framing a test strip
  return (
    <svg {...common}>
      <rect x="13" y="4" width="22" height="40" rx="4" />
      <path d="M21 8h6" />
      <path d="M17 15v-2h3M31 15v-2h-3M17 33v2h3M31 33v2h-3" />
      <rect x="21" y="16" width="6" height="16" rx="1.5" />
      <path d="M21 21h6M21 25.5h6" />
      <circle cx="24" cy="39.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconBackground() {
  // ID card with a magnifying glass
  return (
    <svg {...common}>
      <rect x="4" y="10" width="30" height="22" rx="3" />
      <circle cx="13" cy="19" r="3.5" />
      <path d="M8 27.5c1-2.6 2.8-4 5-4s4 1.4 5 4" />
      <path d="M21 17h8M21 21.5h6" />
      <circle cx="33" cy="32" r="6.5" />
      <path d="M37.8 36.8L44 43" />
    </svg>
  );
}

export function IconPhysicals() {
  // Stethoscope
  return (
    <svg {...common}>
      <path d="M11 5H9v12a9 9 0 0018 0V5h-2" />
      <path d="M18 26v5a9 9 0 0018 0v-4" />
      <circle cx="36" cy="22.5" r="4.5" />
      <circle cx="36" cy="22.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconCollections() {
  // Specimen cup with lid and result window
  return (
    <svg {...common}>
      <rect x="11" y="5" width="26" height="7" rx="2" />
      <path d="M13 12l1.6 29a3 3 0 003 2.8h12.8a3 3 0 003-2.8L35 12" />
      <rect x="18" y="19" width="12" height="12" rx="1.5" />
      <path d="M21 22.5v5M24 22.5v5M27 22.5v5" />
      <path d="M17 36h14" />
    </svg>
  );
}

export function IconAdministration() {
  // Clipboard with stacked program layers
  return (
    <svg {...common}>
      <rect x="9" y="7" width="30" height="37" rx="3" />
      <rect x="17" y="4" width="14" height="6" rx="2" />
      <rect x="15" y="16" width="18" height="5" rx="1.5" />
      <rect x="15" y="24" width="18" height="5" rx="1.5" />
      <rect x="15" y="32" width="18" height="5" rx="1.5" />
    </svg>
  );
}
