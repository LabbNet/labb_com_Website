// Shelf-Life Tracker: read-only view of the Labb POCT tracker (LabbNet/Labb_Extensions) for CPP members.
// Labb staff record lots and quality controls in the tracker itself; this site only reads its public API.

export const TRACKER_URL = (process.env.POCT_TRACKER_URL || "https://labb-poct-tracker.onrender.com").replace(/\/+$/, "");

export type ShelfControl = { dateConducted: string; outcome: "Pass" | "Fail" | string };

export type ShelfLot = {
  id: string;
  poctName: string;
  lotNumber: string;
  originalExpiration: string | null;
  currentExpiration: string | null;
  extensionDays: number;
  daysRemaining: number | null;
  atExtensionCap: boolean;
  status: "Active" | "Extended" | "Control Due" | "Expired" | "Verification Failed" | "Unknown" | string;
  controls: ShelfControl[];
};

export type ShelfConfig = { extensionDaysPerControl: number; maxExtensionDays: number };

const DEFAULT_CONFIG: ShelfConfig = { extensionDaysPerControl: 60, maxExtensionDays: 365 };

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${TRACKER_URL}${path}`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10_000),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Tracker ${path} returned ${res.status}`);
  return (await res.json()) as T;
}

// Only the fields members need. Staff names and QC notes stay in the tracker.
function clean(l: Record<string, unknown>): ShelfLot {
  const controls = Array.isArray(l.controls) ? (l.controls as Record<string, unknown>[]) : [];
  return {
    id: String(l.id ?? ""),
    poctName: String(l.poctName ?? ""),
    lotNumber: String(l.lotNumber ?? ""),
    originalExpiration: (l.originalExpiration as string) || null,
    currentExpiration: (l.currentExpiration as string) || null,
    extensionDays: Number(l.extensionDays) || 0,
    daysRemaining: typeof l.daysRemaining === "number" ? l.daysRemaining : null,
    atExtensionCap: Boolean(l.atExtensionCap),
    status: String(l.status ?? "Unknown"),
    controls: controls
      .map((c) => ({ dateConducted: String(c.dateConducted ?? ""), outcome: String(c.outcome ?? "") }))
      .filter((c) => c.dateConducted),
  };
}

export async function loadShelfLife(): Promise<{ lots: ShelfLot[]; config: ShelfConfig; error: boolean }> {
  const [lots, config] = await Promise.allSettled([
    getJson<{ lots: Record<string, unknown>[] }>("/api/lots"),
    getJson<ShelfConfig>("/api/config"),
  ]);
  return {
    lots: lots.status === "fulfilled" ? (lots.value.lots || []).map(clean) : [],
    config: config.status === "fulfilled" ? { ...DEFAULT_CONFIG, ...config.value } : DEFAULT_CONFIG,
    error: lots.status === "rejected",
  };
}

export const certificateUrl = (id: string) => `${TRACKER_URL}/api/lots/${encodeURIComponent(id)}/certificate.pdf`;

// Status chips in the LabbHR palette.
export const STATUS_CLASS: Record<string, string> = {
  Extended: "sl-extended",
  Active: "sl-active",
  "Control Due": "sl-due",
  Expired: "sl-expired",
  "Verification Failed": "sl-failed",
};

export function fmtDay(d: string | null) {
  if (!d) return "Not set";
  const dt = new Date(`${d}T12:00:00`);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtExtension(days: number) {
  if (!days) return "None";
  const months = Math.round((days / 30) * 10) / 10;
  return `${days} days (${months} mo)`;
}
