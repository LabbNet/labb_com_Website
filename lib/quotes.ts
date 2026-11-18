import "server-only";
import { sql } from "@/lib/db";

export const QUOTE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent to client" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]["value"];
export const isQuoteStatus = (v: string): v is QuoteStatus => QUOTE_STATUSES.some((s) => s.value === v);
export const quoteStatusLabel = (v: string) => QUOTE_STATUSES.find((s) => s.value === v)?.label ?? v;

export type QuoteItem = { product_name: string; sku: string | null; category: string | null; unit: string | null; quantity: number; unit_price_cents: number };
export type Quote = {
  id: string; lead_id: string; member_id: string; status: QuoteStatus; quoted_on: string; state: string | null; industry: string | null;
  segment: string | null; notes: string | null; total_cents: number; created_at: Date; items: QuoteItem[];
};

// Quotes with their line items, newest first.
export async function quotesFor(where: { memberId?: string; leadIds?: string[] }) {
  const db = sql();
  const rows = await db<Omit<Quote, "items">[]>`
    select id, lead_id, member_id, status, to_char(quoted_on, 'Mon FMDD, YYYY') as quoted_on, state, industry, segment, notes, total_cents, created_at
    from member_quotes
    where (${where.memberId ?? null}::uuid is null or member_id = ${where.memberId ?? null}::uuid)
      and (${where.leadIds ? where.leadIds.length : -1} = -1 or lead_id = any(${where.leadIds ?? []}::bigint[]))
    order by created_at desc`;
  if (!rows.length) return [] as Quote[];
  const items = await db<(QuoteItem & { quote_id: string })[]>`
    select quote_id, product_name, sku, category, unit, quantity, unit_price_cents from member_quote_items
    where quote_id = any(${rows.map((r) => r.id)}::bigint[]) order by id`;
  return rows.map((r) => ({ ...r, items: items.filter((i) => i.quote_id === r.id) })) as Quote[];
}
