import "server-only";
import { getSetting, setSetting } from "@/lib/leads";
import { QT_DEFAULT_PRICING, type QtPricing } from "@/lib/quickTest";
import { sql } from "@/lib/db";
import { productLink } from "@/lib/cppPricing";

// Online sale price per kit from the CPP price list, keyed by kit slug.
async function kitCents(): Promise<Record<string, number>> {
  try {
    const rows = await sql()<{ sku: string | null; product_path: string | null; online_cents: number }[]>`
      select sku, product_path, online_cents from cpp_price_items where active and online_cents is not null order by sort, id`;
    const out: Record<string, number> = {};
    for (const r of rows) {
      const m = productLink(r)?.match(/^\/test-kits\/([a-z0-9-]+)$/);
      if (m && !(m[1] in out)) out[m[1]] = r.online_cents;
    }
    return out;
  } catch {
    return {};
  }
}

// Quick Test prices as set in /admin/settings, falling back to the defaults.
export async function getQtPricing(): Promise<QtPricing> {
  const kits = await kitCents();
  return { ...(await savedPricing()), kitCents: kits };
}

async function savedPricing(): Promise<QtPricing> {
  try {
    const raw = await getSetting("quick_test_pricing");
    if (!raw) return QT_DEFAULT_PRICING;
    const saved = JSON.parse(raw) as Partial<QtPricing>;
    const out = { ...QT_DEFAULT_PRICING };
    for (const k of Object.keys(out) as (keyof QtPricing)[]) {
      if (k === "kitCents") continue;
      const v = Number(saved[k]);
      if (Number.isFinite(v) && v >= 0) (out[k] as number) = Math.round(v);
    }
    return out;
  } catch {
    return QT_DEFAULT_PRICING;
  }
}

export async function saveQtPricing(p: Omit<QtPricing, "kitCents">, actorId?: string) {
  await setSetting("quick_test_pricing", JSON.stringify(p), actorId);
}
