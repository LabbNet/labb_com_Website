import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { emailLayout, sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";
import { checkLeadToken, detailRows, detailsOf, esc, leadName, logLeadEvent, notifyAddresses, STAGE_COMPLETE, STAGE_CONTACT } from "@/lib/leads";

// Step 2 of the two-step consultation form: adds the visitor's program details to the lead from step 1.
// Allowed once per lead, and only with the token step 1 returned to the same browser.
const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const id = String(body.lead ?? "").trim().slice(0, 20);
  if (!/^\d{1,18}$/.test(id) || !checkLeadToken(id, str(body.token, 64))) return NextResponse.json({ error: "Invalid request." }, { status: 403 });

  const db = sql();
  const [row] = await db<{ id: string; first_name: string | null; last_name: string | null; company: string | null; email: string; data: Record<string, unknown> | null; industry: string | null; volume: string | null }[]>`
    select id, first_name, last_name, company, email, data, industry, volume from leads where id = ${id}`;
  if (!row) return NextResponse.json({ error: "Invalid request." }, { status: 404 });
  const old = (row.data?.details as Record<string, string> | undefined) || {};
  if (old.stage !== STAGE_CONTACT) return NextResponse.json({ ok: true }); // already completed

  const added = detailsOf(body.details) || {};
  const industry = str(body.industry, 80) || null;
  const volume = str(body.volume, 80) || null;
  const skipped = body.skip === true || (!Object.keys(added).filter((k) => k !== "topic").length && !industry && !volume);
  if (skipped) {
    await logLeadEvent(id, "step2_skipped", "Skipped the program details step");
    return NextResponse.json({ ok: true });
  }
  const details = { ...old, ...added, stage: STAGE_COMPLETE };
  await db`update leads set data = jsonb_set(coalesce(data, '{}'::jsonb), '{details}', ${db.json(details)}),
    industry = coalesce(${industry}, industry), volume = coalesce(${volume}, volume) where id = ${id}`;
  await logLeadEvent(id, "details_added", "Added program details (step 2)");

  const name = leadName(row);
  const rows: [string, string | undefined][] = [
    ["Name", `${row.first_name || ""} ${row.last_name || ""}`.trim()],
    ["Organization", row.company || undefined],
    ["Email", row.email],
    ["Industry", industry || undefined],
    ["Monthly volume", volume || undefined],
    ...detailRows(added),
  ];
  const table = `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px;color:#404951;border-collapse:collapse">${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="font-weight:bold;border-bottom:1px solid #dfe5e5;vertical-align:top">${esc(k)}</td><td style="border-bottom:1px solid #dfe5e5">${esc(v)}</td></tr>`)
    .join("")}</table>`;
  const subject = `Program details added: ${name}`;
  await sendMail(await notifyAddresses(), subject, emailLayout(esc(subject), table, { href: absoluteUrl(`/admin/leads/${id}`), label: "Open the lead" }),
    rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n"), { replyTo: row.email, from: process.env.LEAD_FROM_EMAIL || "Labb Website <info@mail.labb.com>" });
  return NextResponse.json({ ok: true });
}
