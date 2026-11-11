import { currentMember } from "@/lib/auth";
import { findLeads } from "@/lib/leadQuery";
import { segmentLabel, statusLabel } from "@/lib/segments";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
  // Neutralize spreadsheet formulas and quote every cell.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const admin = await currentMember();
  if (!admin || admin.role !== "admin") return new Response("Not authorized", { status: 403 });
  const p = Object.fromEntries(new URL(req.url).searchParams);
  const rows = await findLeads(p, 100000);
  const head = ["ID", "Received", "Segment", "Status", "Owner", "Partner", "First name", "Last name", "Organization", "Email", "Phone", "City", "State",
    "Interested in", "Industry", "Volume", "Interest level", "Message", "Download", "Form", "Page", "Referrer", "Campaign", "Archived"];
  const lines = rows.map((l) => [
    l.id, l.created_at, segmentLabel(l.segment), statusLabel(l.status), l.owner === "partner" ? "Partner" : "Labb", l.partner_clinic || l.partner_name,
    l.first_name, l.last_name, l.company, l.email, l.phone, l.city, l.state, l.products, l.industry, l.volume, l.interest, l.message, l.resource,
    l.type, l.page, l.referrer, l.utm, l.archived ? "Yes" : "No",
  ].map(cell).join(","));
  const csv = "﻿" + [head.map(cell).join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="labb-leads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
