import { cppEmail, absoluteUrl } from "@/lib/site";
import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { esc } from "@/lib/leads";
import { emailLayout, sendMail } from "@/lib/mail";
import { publishedKits } from "@/lib/kits";
import { fmtDay } from "@/lib/shelfLife";

// A CPP member asks Labb to extend a rapid test lot. Stored, then emailed to the CPP inbox.
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  const back = "/members/shelf-life#request";
  const m = await currentMember();
  if (!m) return go(req, "/login?next=/members/shelf-life");
  if (!m.shelf_life_tracker && m.role !== "admin") return go(req, "/members");
  if (!(await sameOrigin())) return go(req, back);
  const fd = await req.formData();
  const err = async (msg: string) => { await setFlash(msg, "error", undefined, "/members"); return go(req, back); };

  const kitRaw = field(fd, "kit", 40);
  const kit = kitRaw === "other" ? field(fd, "kit_other", 80) : publishedKits.find((k) => k.code === kitRaw)?.code || "";
  const lot = field(fd, "lot_number", 60);
  const printed = field(fd, "printed_exp", 10);
  const needBy = field(fd, "need_by", 10);
  if (!kit || !lot || !DATE.test(printed)) return err("Enter the test, the lot number and the expiration date printed on the box.");
  if (needBy && !DATE.test(needBy)) return err("Enter the needed-by date as a full date.");
  const quantity = field(fd, "quantity", 80) || null;
  const notes = field(fd, "notes", 1500) || null;

  const db = sql();
  const [dup] = await db<{ id: string }[]>`
    select id from shelf_life_requests where member_id = ${m.id} and lower(lot_number) = lower(${lot}) and status in ('requested', 'in_review') limit 1`;
  if (dup) return err(`You already have an open request (#${dup.id}) for lot ${lot}. Labb will update it here.`);
  const [r] = await db<{ id: string }[]>`
    insert into shelf_life_requests (member_id, kit, lot_number, printed_exp, quantity, need_by, notes)
    values (${m.id}, ${kit}, ${lot}, ${printed}, ${quantity}, ${needBy || null}, ${notes}) returning id`;

  const rows: [string, string][] = [
    ["Member", m.clinic ? `${m.name} (${m.clinic})` : m.name],
    ["Email", m.email],
    ["Test", kit],
    ["Lot number", lot],
    ["Printed expiration", fmtDay(printed)],
    ["Quantity on hand", quantity || "Not given"],
    ["Needed by", needBy ? fmtDay(needBy) : "Not specified"],
    ["Notes", notes || ""],
  ];
  const table = `<table cellpadding="8" style="border-collapse:collapse;width:100%;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="font-weight:bold;border-bottom:1px solid #dfe5e5;vertical-align:top">${esc(k)}</td><td style="border-bottom:1px solid #dfe5e5">${esc(v)}</td></tr>`)
    .join("")}</table>`;
  try {
    await sendMail([cppEmail], `Lot extension request: ${kit} lot ${lot} (${m.clinic || m.name})`,
      emailLayout("New lot extension request", table, { href: absoluteUrl("/admin/shelf-life"), label: "Review requests" }),
      rows.map(([k, v]) => `${k}: ${v}`).join("\n"), { replyTo: m.email });
  } catch (e) {
    console.error("[shelf-life] notify failed", e);
  }
  await setFlash(`Request #${r.id} received for lot ${lot}. Labb will review it and update the status below.`, "ok", undefined, "/members");
  return go(req, back);
}
