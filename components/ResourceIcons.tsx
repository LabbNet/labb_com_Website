// Line icons for the CPP member Resources categories. Stroke uses currentColor.
const common = {
  width: 30, height: 30, viewBox: "0 0 48 48", fill: "none", stroke: "currentColor",
  strokeWidth: 2.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
};

export const IconHandbook = () => (
  <svg {...common}>
    <path d="M24 12c-4-3-10-4-17-3v29c7-1 13 0 17 3 4-3 10-4 17-3V9c-7-1-13 0-17 3z" />
    <path d="M24 12v29" />
    <path d="M12 17h7M12 23h7M29 17h7M29 23h7" />
  </svg>
);

export const IconMarketing = () => (
  <svg {...common}>
    <path d="M7 20v8a2 2 0 002 2h5l14 8V10L14 18H9a2 2 0 00-2 2z" />
    <path d="M14 30l3 9h5l-2-8" />
    <path d="M34 18a8 8 0 010 12M38 13a14 14 0 010 22" />
  </svg>
);

export const IconReference = () => (
  <svg {...common}>
    <path d="M28 5H12a3 3 0 00-3 3v32a3 3 0 003 3h24a3 3 0 003-3V16z" />
    <path d="M28 5v11h11" />
    <circle cx="22" cy="28" r="6" />
    <path d="M26.5 32.5L31 37" />
  </svg>
);

export const IconDataSheet = () => (
  <svg {...common}>
    <rect x="9" y="5" width="30" height="38" rx="3" />
    <path d="M15 13h18" />
    <rect x="15" y="19" width="18" height="16" rx="1.5" />
    <path d="M15 27h18M24 19v16" />
  </svg>
);

export const IconCertification = () => (
  <svg {...common}>
    <circle cx="24" cy="18" r="11" />
    <path d="M19 18l3.5 3.5L29 15" />
    <path d="M17 27l-4 15 6-3 5 4M31 27l4 15-6-3-5 4" />
  </svg>
);

export const IconSupport = () => (
  <svg {...common}>
    <path d="M9 28v-5a15 15 0 0130 0v5" />
    <rect x="6" y="26" width="8" height="11" rx="3" />
    <rect x="34" y="26" width="8" height="11" rx="3" />
    <path d="M38 37v1a5 5 0 01-5 5h-6" />
    <rect x="21" y="40" width="7" height="5" rx="2" />
  </svg>
);

export const IconDrugProfile = () => (
  <svg {...common}>
    <rect x="6" y="18" width="30" height="13" rx="6.5" transform="rotate(-35 21 24.5)" />
    <path d="M17.5 16.5l7.5 10.7" />
    <circle cx="37" cy="35" r="6" />
    <path d="M33 39l8-8" />
  </svg>
);
