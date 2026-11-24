import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { scanDupes } from "@/lib/dupes";
import { field, go } from "@/lib/http";
import { mergeLeads } from "@/lib/leads";

// Review queue for possible duplicate leads: merge chosen leads into one record, or mark the group as different people.
export async function POST(req: Request) {
  const me = await currentMember();
  if (!me || me.role !== "admin") return go(req, "/admin-login");
  if (!(await sameOrigin())) return go(req, "/admin/leads/duplicates");
  const fd = await req.formData();
  const action = (fd.getAll("action").map(String).pop() || "").slice(0, 20);
  const flash = (m: string, k: "ok" | "error" = "ok") => setFlash(m, k, undefined, "/admin");
  const db = sql();
  const back = "/admin/leads/duplicates";
  if (action === "scan") {
    const n = await scanDupes();
    await flash(n ? `Found ${n} new possible ${n === 1 ? "match" : "matches"}.` : "No new possible duplicates found.");
    return go(req, back);
  }
  const group = fd.getAll("lead").map(String).filter((x) => /^\d+$/.test(x)).slice(0, 200);
  if (action === "dismiss") {
    await db`update lead_dupe_flags set status = 'dismissed', decided_by = ${me.id}, decided_at = now()
      where status = 'open' and lead_a = any(${group}::bigint[]) and lead_b = any(${group}::bigint[])`;
    await flash("Marked as different. These leads won't be flagged against each other again.");
  } else if (action === "merge") {
    const keep = field(fd, "keep", 20);
    const merge = fd.getAll("merge").map(String).filter((x) => /^\d+$/.test(x) && x !== keep && group.includes(x));
    if (!group.includes(keep) || !merge.length) { await flash("Choose the lead to keep and at least one lead to merge into it.", "error"); return go(req, back); }
    try {
      const n = await mergeLeads(keep, merge, { id: me.id, name: me.name });
      // Anything left unchecked in this group is a different person from the kept lead.
      const rest = group.filter((x) => x !== keep && !merge.includes(x));
      if (rest.length) await db`update lead_dupe_flags set status = 'dismissed', decided_by = ${me.id}, decided_at = now()
        where status = 'open' and ((lead_a = ${keep}::bigint and lead_b = any(${rest}::bigint[])) or (lead_b = ${keep}::bigint and lead_a = any(${rest}::bigint[])))`;
      await flash(`Merged ${n} ${n === 1 ? "lead" : "leads"} into #${keep}.`);
    } catch (e) {
      await flash(e instanceof Error ? e.message : "The merge didn't go through.", "error");
    }
  }
  return go(req, back);
}
