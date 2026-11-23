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

// ---- Lot extension requests (stored on labb.com, worked by Labb staff in Admin > Shelf-life requests) ----
export const SLR_STATUSES = [
  { value: "requested", label: "Requested" },
  { value: "in_review", label: "Control scheduled" },
  { value: "extended", label: "Extended" },
  { value: "declined", label: "Not extended" },
] as const;
export type SlrStatus = (typeof SLR_STATUSES)[number]["value"];
export const isSlrStatus = (s: string): s is SlrStatus => SLR_STATUSES.some((x) => x.value === s);
export const slrStatusLabel = (s: string) => SLR_STATUSES.find((x) => x.value === s)?.label ?? s;
export const SLR_CLASS: Record<string, string> = { requested: "s-invited", in_review: "sl-due", extended: "sl-extended", declined: "s-disabled" };
export const SLR_COLUMNS = `id, kit, lot_number, to_char(printed_exp, 'YYYY-MM-DD') as printed_exp, quantity,
  to_char(need_by, 'YYYY-MM-DD') as need_by, notes, status, admin_note, created_at, updated_at`;
export type SlrRow = {
  id: string; kit: string; lot_number: string; printed_exp: string; quantity: string | null; need_by: string | null;
  notes: string | null; status: string; admin_note: string | null; created_at: Date; updated_at: Date;
};
