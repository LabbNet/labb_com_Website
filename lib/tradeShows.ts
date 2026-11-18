// Shared values for CPP trade show requests.
export const TS_STATUSES = [
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "shipped", label: "Shipped" },
  { value: "declined", label: "Declined" },
] as const;
export type TsStatus = (typeof TS_STATUSES)[number]["value"];
export const isTsStatus = (v: unknown): v is TsStatus => TS_STATUSES.some((s) => s.value === v);
export const tsStatusLabel = (v: string) => TS_STATUSES.find((s) => s.value === v)?.label || v;
// Printed pieces members can request for a show (the Marketing section of the CPP library).
export const TS_BROCHURES = [
  { value: "oraflo-booklet", label: "OraFlo Rapid Drug Testing Booklet" },
  { value: "etest-cup-booklet", label: "eTest Cup Booklet" },
  { value: "etest-swab-booklet", label: "eTest Swab Booklet" },
  { value: "etest-cup-lineup", label: "eTest Cup Product Lineup" },
  { value: "kiosk-brochure", label: "LabbHR Proctor Testing Kiosk Brochure" },
] as const;
export const BROCHURE_LIMIT = 50; // total printed pieces per request; more than this, call Labb
export type BrochureItem = { item: string; qty: number };
export const brochureLabel = (v: string) => TS_BROCHURES.find((b) => b.value === v)?.label || v;
export const brochureSummary = (items: BrochureItem[] | null | undefined, total: number) =>
  items?.length ? items.map((i) => `${i.qty} ${brochureLabel(i.item)}`).join(", ") : total ? `${total} brochures` : "";
export const TS_LIMIT_NOTE =
  "Limit 1 set of pop-up banner stands per CPP member when attending trade shows. Labb's total contribution for attending a trade show will not exceed $450 per member. Limit 1 sponsored show per CPP member.";
export type TsRow = {
  id: string; member_id: string; show_name: string; show_city: string; show_state: string; venue: string | null; show_url: string | null;
  start_date: string; end_date: string | null; brochures: number; brochure_items: BrochureItem[]; banner_stands: boolean; other_items: string | null;
  ship_name: string | null; ship_line1: string | null; ship_line2: string | null; ship_city: string | null; ship_state: string | null; ship_zip: string | null;
  need_by: string | null; notes: string | null; status: TsStatus; admin_note: string | null; created_at: Date;
};
export const fmtDay = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
export const showDates = (r: Pick<TsRow, "start_date" | "end_date">) =>
  r.end_date && r.end_date !== r.start_date ? `${fmtDay(r.start_date)} to ${fmtDay(r.end_date)}` : fmtDay(r.start_date);
export const TS_COLUMNS = `id, member_id, show_name, show_city, show_state, venue, show_url,
  to_char(start_date, 'YYYY-MM-DD') as start_date, to_char(end_date, 'YYYY-MM-DD') as end_date, brochures, brochure_items, banner_stands, other_items,
  ship_name, ship_line1, ship_line2, ship_city, ship_state, ship_zip, to_char(need_by, 'YYYY-MM-DD') as need_by, notes, status, admin_note, created_at`;
