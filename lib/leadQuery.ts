import "server-only";
import { sql } from "@/lib/db";
import type { LeadRow } from "@/lib/leads";
import { isSegment, isStatus } from "@/lib/segments";

export type LeadFilters = { q?: string; segment?: string; owner?: string; partner?: string; status?: string; archived?: string };

// Shared by the admin lead list and the CSV export so both always show the same rows.
export async function findLeads(f: LeadFilters, limit = 500) {
  const db = sql();
  const q = (f.q || "").toLowerCase().slice(0, 80);
  const like = `%${q}%`;
  const segment = isSegment(f.segment) ? f.segment : "";
  const status = isStatus(f.status) ? f.status : "";
  const owner = f.owner === "labb" || f.owner === "partner" ? f.owner : "";
  const partner = /^[0-9a-f-]{36}$/.test(f.partner || "") ? f.partner! : "";
  const archived = f.archived === "yes" ? true : f.archived === "all" ? null : false;

  return db<LeadRow[]>`
    select l.*, m.name as partner_name, m.clinic as partner_clinic
    from leads l left join members m on m.id = l.partner_id
    where true
      ${q ? db`and (lower(coalesce(l.first_name,'') || ' ' || coalesce(l.last_name,'')) like ${like} or lower(l.email) like ${like} or lower(coalesce(l.company,'')) like ${like} or lower(coalesce(l.state,'')) like ${like})` : db``}
      ${segment ? db`and l.segment = ${segment}` : db``}
      ${status ? db`and l.status = ${status}` : db``}
      ${owner ? db`and l.owner = ${owner}` : db``}
      ${partner ? db`and l.partner_id = ${partner}` : db``}
      ${archived === null ? db`` : db`and l.archived = ${archived}`}
    order by l.created_at desc
    limit ${limit}`;
}

export async function partnerOptions() {
  return sql()<{ id: string; name: string; clinic: string | null; email: string }[]>`
    select id, name, clinic, email from members where role = 'member' and status <> 'disabled' order by lower(coalesce(clinic, name))`;
}
