import { cppEmail } from "@/lib/site";
import { currentMember, sameOrigin } from "@/lib/auth";
import { setFlash } from "@/lib/admin";
import { sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { esc } from "@/lib/leads";
import { emailLayout, sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";
import { BROCHURE_QTY, showDates } from "@/lib/tradeShows";

// A CPP member requests sponsored materials for a trade show. Stored, then emailed to the Labb notification address.
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  const m = await currentMember();
  if (!m) return go(req, "/login?next=/members/trade-shows");
  if (!(await sameOrigin())) return go(req, "/members/trade-shows");
  const fd = await req.formData();
  const back = "/members/trade-shows";
  const err = async (msg: string) => { await setFlash(msg, "error", undefined, "/members"); return go(req, back); };

  const show = field(fd, "show_name", 160);
  const city = field(fd, "show_city", 80);
  const state = field(fd, "show_state", 40);
  const start = field(fd, "start_date", 10);
  const end = field(fd, "end_date", 10);
  if (!show || !city || !state || !DATE.test(start)) return err("Enter the show name, city, state and start date.");
  if (end && (!DATE.test(end) || end < start)) return err("The end date must be on or after the start date.");
  const brochures = Number(field(fd, "brochures", 5)) || 0;
  if (!BROCHURE_QTY.includes(brochures)) return err("Choose a brochure quantity from the list.");
  const banners = fd.get("banner_stands") === "yes";
  const other = field(fd, "other_items", 1000);
  if (!brochures && !banners && !other) return err("Choose at least one item: brochures, banner stands or other items.");
  const needBy = field(fd, "need_by", 10);
  const url = field(fd, "show_url", 300);
  const v = {
    venue: field(fd, "venue", 160) || null,
    url: /^https?:\/\//i.test(url) ? url : url ? `https://${url}` : null,
    shipName: field(fd, "ship_name", 120) || null,
    line1: field(fd, "ship_line1", 160),
    line2: field(fd, "ship_line2", 160) || null,
    sCity: field(fd, "ship_city", 80),
    sState: field(fd, "ship_state", 40),
    zip: field(fd, "ship_zip", 12),
    needBy: DATE.test(needBy) ? needBy : null,
    notes: field(fd, "notes", 2000) || null,
  };
  if (!v.line1 || !v.sCity || !v.sState || !v.zip) return err("Enter the shipping address for your materials.");

  const db = sql();
  const [prior] = await db<{ n: number }[]>`select count(*)::int as n from trade_show_requests where member_id = ${m.id} and status <> 'declined'`;
  const [r] = await db<{ id: string }[]>`
    insert into trade_show_requests (member_id, show_name, show_city, show_state, venue, show_url, start_date, end_date, brochures, banner_stands,
      other_items, ship_name, ship_line1, ship_line2, ship_city, ship_state, ship_zip, need_by, notes)
    values (${m.id}, ${show}, ${city}, ${state}, ${v.venue}, ${v.url}, ${start}, ${end || null}, ${brochures}, ${banners},
      ${other || null}, ${v.shipName}, ${v.line1}, ${v.line2}, ${v.sCity}, ${v.sState}, ${v.zip}, ${v.needBy}, ${v.notes})
    returning id`;

  const items = [brochures ? `${brochures} brochures` : "", banners ? "1 set of pop-up banner stands" : "", other ? `Other: ${other}` : ""].filter(Boolean).join("; ");
  const rows: [string, string][] = [
    ["Member", m.clinic ? `${m.name} (${m.clinic})` : m.name],
    ["Email", m.email],
    ["Show", show],
    ["Location", `${v.venue ? `${v.venue}, ` : ""}${city}, ${state}`],
    ["Dates", showDates({ start_date: start, end_date: end || null })],
    ["Items", items],
    ["Ship to", [v.shipName, v.line1, v.line2, `${v.sCity}, ${v.sState} ${v.zip}`].filter(Boolean).join(", ")],
    ["Needed by", v.needBy || "Not specified"],
    ["Notes", v.notes || ""],
    ["Prior sponsored requests", prior.n ? `${prior.n} (limit 1 sponsored show per member)` : "None"],
  ];
  const table = `<table cellpadding="8" style="border-collapse:collapse;width:100%;font-size:14px">${rows
    .map(([k, val]) => `<tr><td style="font-weight:bold;border-bottom:1px solid #dfe5e5;vertical-align:top">${esc(k)}</td><td style="border-bottom:1px solid #dfe5e5">${esc(val)}</td></tr>`)
    .join("")}</table>`;
  const text = rows.map(([k, val]) => `${k}: ${val}`).join("\n");
  try {
    await sendMail([cppEmail], `Trade show request: ${show} (${m.clinic || m.name})`,
      emailLayout("New CPP trade show request", table, { href: absoluteUrl("/admin/trade-shows"), label: "Review requests" }), text, { replyTo: m.email });
  } catch (e) {
    console.error("[trade-shows] notify failed", e);
  }
  await setFlash(
    prior.n
      ? `Request ${r.id} received. You already have a sponsored show on file, so Labb will confirm what can be covered.`
      : `Request ${r.id} received. Labb will confirm and let you know when your materials ship.`,
    "ok", undefined, "/members");
  return go(req, back);
}
