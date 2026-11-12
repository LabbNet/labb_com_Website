import "server-only";
import { getSetting, setSetting } from "@/lib/leads";
import { QT_DEFAULT_PRICING, type QtPricing } from "@/lib/quickTest";

// Quick Test prices as set in /admin/settings, falling back to the defaults.
export async function getQtPricing(): Promise<QtPricing> {
  try {
    const raw = await getSetting("quick_test_pricing");
    if (!raw) return QT_DEFAULT_PRICING;
    const saved = JSON.parse(raw) as Partial<QtPricing>;
    const out = { ...QT_DEFAULT_PRICING };
    for (const k of Object.keys(out) as (keyof QtPricing)[]) {
      const v = Number(saved[k]);
      if (Number.isFinite(v) && v >= 0) out[k] = Math.round(v);
    }
    return out;
  } catch {
    return QT_DEFAULT_PRICING;
  }
}

export async function saveQtPricing(p: QtPricing, actorId?: string) {
  await setSetting("quick_test_pricing", JSON.stringify(p), actorId);
}
