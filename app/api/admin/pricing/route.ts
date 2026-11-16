import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { isPriceCategory, parseCents, PRICE_FIELDS } from "@/lib/cppPricing";

// Admin add, edit and delete for the CPP member price list.
export async function POST(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return go(req, "/login?next=/admin/pricing");
  if (!(await sameOrigin())) return go(req, "/admin/pricing");
  const fd = await req.formData();
  const action = field(fd, "action", 10);
  const id = field(fd, "id", 20);
  const db = sql();
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");
  const category = field(fd, "category", 20);
  const back = `/admin/pricing${isPriceCategory(category) ? `#${category}` : ""}`;

  if (action === "delete") {
    if (/^\d+$/.test(id)) {
      const [r] = await db<{ name: string }[]>`delete from cpp_price_items where id = ${id} returning name`;
      if (r) await flash(`Deleted ${r.name}.`);
    }
    return go(req, back);
  }

  const name = field(fd, "name", 160);
  const [sl1, sl1m, sl3, sl3m] = PRICE_FIELDS.map((f) => parseCents(field(fd, f.form, 20)));
  if (!isPriceCategory(category) || !name) {
    await flash("Choose a category and enter a product name.", "error");
    return go(req, back);
  }
  if ([sl1, sl1m, sl3, sl3m].some((v) => v === undefined)) {
    await flash("Enter prices as numbers, for example 12.50.", "error");
    return go(req, back);
  }
  const v = {
    sku: field(fd, "sku", 60) || null,
    description: field(fd, "description", 600) || null,
    unit: field(fd, "unit", 60) || null,
    notes: field(fd, "notes", 300) || null,
    sort: Number(field(fd, "sort", 5)) || 100,
    active: fd.get("active") !== "no",
  };

  if (action === "update" && /^\d+$/.test(id)) {
    await db`
      update cpp_price_items set category = ${category}, name = ${name}, sku = ${v.sku}, description = ${v.description}, unit = ${v.unit},
        sl1_cents = ${sl1 ?? null}, sl1_msrp_cents = ${sl1m ?? null}, sl3_cents = ${sl3 ?? null}, sl3_msrp_cents = ${sl3m ?? null}, notes = ${v.notes}, sort = ${v.sort}, active = ${v.active},
        updated_at = now(), updated_by = ${admin.id}
      where id = ${id}`;
    await flash(`Saved ${name}.`);
  } else {
    await db`
      insert into cpp_price_items (category, name, sku, description, unit, sl1_cents, sl1_msrp_cents, sl3_cents, sl3_msrp_cents, notes, sort, active, updated_by)
      values (${category}, ${name}, ${v.sku}, ${v.description}, ${v.unit}, ${sl1 ?? null}, ${sl1m ?? null}, ${sl3 ?? null}, ${sl3m ?? null}, ${v.notes}, ${v.sort}, ${v.active}, ${admin.id})`;
    await flash(`Added ${name}.`);
  }
  return go(req, back);
}
