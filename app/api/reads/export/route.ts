import { readAccess, hoursBetween } from "@/lib/reads";

// CSV of paid hours per read admin per day, for payroll. Super read admins only.
export async function GET(req: Request) {
  const a = await readAccess();
  if (!a || !a.superRead || (!a.reader && !a.superadmin)) return new Response("Not found", { status: 404 });
  const u = new URL(req.url).searchParams;
  const ok = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const from = ok(u.get("from")), to = ok(u.get("to"));
  if (!from || !to) return new Response("Choose a date range", { status: 400 });
  const who = u.get("who") && /^[0-9a-f-]{36}$/.test(u.get("who")!) ? u.get("who") : null;
  const rows = await hoursBetween(from, to, who);
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [["Read admin", "Date", "Shifts", "Scheduled hours", "Approved changes", "Waiting for approval", "Hours to be paid"].map(q).join(",")];
  for (const r of rows) lines.push([r.name, r.day, r.shifts, r.scheduled.toFixed(2), r.adjusted.toFixed(2), r.pending.toFixed(2), (r.scheduled + r.adjusted).toFixed(2)].map(q).join(","));
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.name, (totals.get(r.name) || 0) + r.scheduled + r.adjusted);
  lines.push("");
  lines.push([q("Totals"), q(`${from} to ${to}`)].join(","));
  for (const [n, t] of totals) lines.push([q(n), q(""), q(""), q(""), q(""), q(""), q(t.toFixed(2))].join(","));
  return new Response(lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="labb-reads-hours-${from}-to-${to}.csv"`, "Cache-Control": "no-store" },
  });
}
