import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { field, go } from "@/lib/http";
import { mergeLeads } from "@/lib/leads";

// Leads list: merge the checked leads into the one chosen to keep.
export async function POST(req: Request) {
  const me = await currentMember();
  if (!me || me.role !== "admin") return go(req, "/admin-login");
  const fd = await req.formData();
  const backRaw = field(fd, "back", 300);
  const back = backRaw.startsWith("/admin/leads") ? backRaw : "/admin/leads";
  if (!(await sameOrigin())) return go(req, back);
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");
  const ids = [...new Set(fd.getAll("ids").map(String).filter((x) => /^\d+$/.test(x)))].slice(0, 50);
  const keep = field(fd, "keep", 20);
  if (ids.length < 2 || !ids.includes(keep)) {
    await flash("Check at least two leads and choose the one to keep.", "error");
    return go(req, back);
  }
  try {
    const n = await mergeLeads(keep, ids.filter((x) => x !== keep), { id: me.id, name: me.name });
    await flash(`Merged ${n} ${n === 1 ? "lead" : "leads"} into lead #${keep}.`);
    return go(req, `/admin/leads/${keep}`);
  } catch (e) {
    await flash(e instanceof Error ? e.message : "The merge didn't go through.", "error");
    return go(req, back);
  }
}
