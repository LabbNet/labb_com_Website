import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { sql } from "@/lib/db";
import { emailLayout, esc, sendMail } from "@/lib/mail";
import { absoluteUrl, cppEmail } from "@/lib/site";

// CPP agreement signing. Labb uploads the agreement PDF once (contract_templates). "Send Contract"
// emails the prospect a one-time link; they review the PDF, consent to sign electronically, type their
// name and sign. The server appends a signature and audit page to the exact PDF that was sent, saves it
// to the member's contracts and emails a copy to the signer and to Labb. Meets the ESIGN Act / UETA
// basics: consent to electronic records, intent to sign, attribution (link sent to their email, IP and
// device recorded) and a retained, tamper-evident copy (SHA-256 of the original and the signed file).

const LINK_DAYS = 30;
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

export type Template = { id: string; title: string; version: string; filename: string; sha256: string; uploaded_at: Date };

export async function activeTemplate(): Promise<Template | null> {
  const [t] = await sql()<Template[]>`
    select id, title, version, filename, sha256, uploaded_at from contract_templates where active order by uploaded_at desc limit 1`;
  return t ?? null;
}

export async function saveTemplate(file: Uint8Array, filename: string, title: string, version: string, adminId: string) {
  await PDFDocument.load(file, { ignoreEncryption: true }); // throws if it isn't a readable PDF
  const db = sql();
  await db.begin(async (tx) => {
    await tx`update contract_templates set active = false where active`;
    await tx`insert into contract_templates (title, version, filename, data, sha256, active, uploaded_by)
      values (${title}, ${version}, ${filename}, ${Buffer.from(file)}, ${sha256(file)}, true, ${adminId})`;
  });
}

type Prospect = { id: string; name: string; email: string; clinic: string | null; legal_name: string | null };

// Creates a fresh signing link (older unsigned links stop working) and emails it.
export async function sendContract(memberId: string, adminId: string) {
  const db = sql();
  const t = await activeTemplate();
  if (!t) return { error: "Upload the CPP agreement PDF first (Members, CPP agreement)." };
  const [m] = await db<Prospect[]>`select id, name, email, clinic, legal_name from members where id = ${memberId}`;
  if (!m) return { error: "Member not found." };
  const token = randomBytes(32).toString("base64url");
  await db`update contract_requests set status = 'void' where member_id = ${m.id} and status in ('sent', 'viewed')`;
  await db`insert into contract_requests (member_id, template_id, token_hash, sent_to, sent_by, expires_at)
    values (${m.id}, ${t.id}, ${sha256(Buffer.from(token))}, ${m.email}, ${adminId}, now() + make_interval(days => ${LINK_DAYS}))`;
  const link = absoluteUrl(`/contract/${token}`);
  const first = m.name.split(" ")[0];
  const ok = await sendMail(
    m.email,
    `Your Labb Channel Partner Program agreement is ready to sign`,
    emailLayout(
      "Your CPP agreement is ready",
      `<p>Hi ${esc(first)},</p>
       <p>Your ${esc(t.title)} (version ${esc(t.version)}) for <strong>${esc(m.legal_name || m.clinic || m.name)}</strong> is ready.
       Review it and sign online. It takes about two minutes, and you'll get a signed copy by email.</p>
       <p>The link is for you only and expires in ${LINK_DAYS} days. Questions? Reply to this email or write to ${cppEmail}.</p>`,
      { href: link, label: "Review and sign" },
    ),
    `Your ${t.title} (version ${t.version}) is ready to sign: ${link}\nThe link expires in ${LINK_DAYS} days. Questions? ${cppEmail}`,
    { replyTo: cppEmail },
  );
  return ok ? { ok: true, to: m.email } : { error: "The signing link was created, but the email didn't send. Check the mail settings." };
}

type Field = { key: string; page: number; x: number; y: number; w: number; size: number };

export type SignRequest = {
  id: string; status: string; expires_at: Date; signed_at: Date | null; sent_to: string; template_id: string;
  title: string; version: string; tsha: string; fields: Field[] | null; member_id: string; name: string; clinic: string | null;
  legal_name: string | null; member_contract_id: string | null;
  signer_name: string | null; signer_title: string | null; signer_company: string | null; signer_state: string | null;
  signer_ip: string | null; signer_agent: string | null;
  labb_signer_name: string | null; labb_signer_title: string | null; labb_signed_at: Date | null; labb_ip: string | null;
};

const REQUEST_SQL = (where: ReturnType<ReturnType<typeof sql>>) => sql()<SignRequest[]>`
  select r.id, r.status, r.expires_at, r.signed_at, r.sent_to, r.template_id, t.title, t.version, t.sha256 as tsha, t.fields,
    m.id as member_id, m.name, m.clinic, m.legal_name, r.member_contract_id,
    r.signer_name, r.signer_title, r.signer_company, r.signer_state, r.signer_ip, r.signer_agent,
    r.labb_signer_name, r.labb_signer_title, r.labb_signed_at, r.labb_ip
  from contract_requests r join contract_templates t on t.id = r.template_id join members m on m.id = r.member_id
  where ${where}`;

export async function requestByToken(token: string): Promise<SignRequest | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const [r] = await REQUEST_SQL(sql()`r.token_hash = ${sha256(Buffer.from(token))}`);
  return r ?? null;
}

export async function requestById(id: string): Promise<SignRequest | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  const [r] = await REQUEST_SQL(sql()`r.id = ${id}`);
  return r ?? null;
}

export const isOpen = (r: SignRequest) => (r.status === "sent" || r.status === "viewed") && r.expires_at.getTime() > Date.now();

export async function markViewed(r: SignRequest) {
  if (r.status === "sent") await sql()`update contract_requests set status = 'viewed', viewed_at = now() where id = ${r.id} and status = 'sent'`;
}

export async function templatePdf(id: string) {
  const [t] = await sql()<{ data: Buffer; filename: string }[]>`select data, filename from contract_templates where id = ${id}`;
  return t ?? null;
}

type Partner = { name: string; title: string; company: string; state: string; ip: string; agent: string; at: Date };
type Labb = { name: string; title: string; ip: string; at: Date };

const longDate = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });
const whenET = (d: Date) => d.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "long", timeStyle: "short" }) + " ET";
const fileNameFor = (r: SignRequest, company: string, executed: boolean) =>
  `CPP Agreement v${r.version} - ${company}${executed ? " - fully executed" : " - signed by partner"}.pdf`.replace(/[^\w .()-]/g, "").slice(0, 140);

// Step 1: the partner signs. Their details and signature go on the agreement; Labb countersigns next.
export async function signContract(r: SignRequest, s: Omit<Partner, "at">) {
  const db = sql();
  const original = await originalPdf(r);
  const partner: Partner = { ...s, at: new Date() };
  const pdf = await buildPdf(original, r, partner, null);
  const fileName = fileNameFor(r, s.company, false);
  const signedHash = sha256(pdf);

  // Claim the request first so a double submit can't sign twice.
  const claimed = await db`update contract_requests set status = 'signed', signed_at = ${partner.at}, signer_name = ${s.name},
      signer_title = ${s.title}, signer_company = ${s.company}, signer_state = ${s.state}, signer_ip = ${s.ip}, signer_agent = ${s.agent},
      signed_sha256 = ${signedHash}
    where id = ${r.id} and status in ('sent', 'viewed') and expires_at > now() returning id`;
  if (!claimed.length) return { error: "This link has already been used or has expired." };
  const [c] = await db<{ id: string }[]>`
    insert into member_contracts (member_id, filename, content_type, size_bytes, data, note, uploaded_by)
    values (${r.member_id}, ${fileName}, 'application/pdf', ${pdf.length}, ${Buffer.from(pdf)},
      ${`Signed by ${s.name} ${partner.at.toISOString()}. Awaiting Labb countersignature. SHA-256 ${signedHash}`}, null)
    returning id`;
  await db`update contract_requests set member_contract_id = ${c.id} where id = ${r.id}`;
  await db`update members set legal_name = ${s.company}, updated_at = now() where id = ${r.member_id}`;
  await db`insert into member_events (member_id, event, detail, ip) values (${r.member_id}, 'contract_signed', ${`${r.title} v${r.version} signed by ${s.name}`}, ${s.ip})`;

  const attachments = [{ filename: fileName, content: Buffer.from(pdf), type: "application/pdf" }];
  await sendMail(
    r.sent_to,
    "Your signed Labb Channel Partner Program agreement",
    emailLayout("Thank you for signing", `<p>Hi ${esc(s.name.split(" ")[0])},</p><p>We received your signed ${esc(r.title)} for <strong>${esc(s.company)}</strong> (signed ${esc(whenET(partner.at))}). Your copy is attached.</p><p>Labb will countersign and send you the fully executed agreement. Questions? Write to ${cppEmail}.</p>`),
    `We received your signed ${r.title} for ${s.company} (signed ${whenET(partner.at)}). Labb will countersign and send you the fully executed copy. Questions? ${cppEmail}`,
    { replyTo: cppEmail, attachments },
  );
  await sendMail(
    labbInbox(),
    `CPP agreement signed, ready to countersign: ${s.company}`,
    emailLayout("Ready to countersign", `<p><strong>${esc(s.name)}</strong>${s.title ? `, ${esc(s.title)}` : ""} signed the ${esc(r.title)} (version ${esc(r.version)}) for <strong>${esc(s.company)}</strong> on ${esc(whenET(partner.at))}.</p><p>Countersign on the member's page to make it effective. Their signed copy is attached.</p>`, { href: absoluteUrl(`/admin/members/${r.member_id}`), label: "Countersign for Labb" }),
    `${s.name} signed the ${r.title} v${r.version} for ${s.company} on ${whenET(partner.at)}. Countersign: ${absoluteUrl(`/admin/members/${r.member_id}`)}`,
    { attachments },
  );
  return { ok: true };
}

// Step 2: a Labb admin countersigns. The agreement's Effective Date is this (the later) signature date.
export async function countersign(requestId: string, admin: { id: string; name: string }, title: string, ip: string) {
  const db = sql();
  const r = await requestById(requestId);
  if (!r || r.status !== "signed" || !r.signer_name || !r.signed_at) return { error: "The partner hasn't signed this agreement yet." };
  if (r.labb_signed_at) return { error: "Labb already countersigned this agreement." };
  const original = await originalPdf(r);
  const partner: Partner = {
    name: r.signer_name, title: r.signer_title || "", company: r.signer_company || r.legal_name || r.name, state: r.signer_state || "",
    ip: r.signer_ip || "", agent: r.signer_agent || "", at: r.signed_at,
  };
  const labb: Labb = { name: admin.name, title, ip, at: new Date() };
  const pdf = await buildPdf(original, r, partner, labb);
  const fileName = fileNameFor(r, partner.company, true);
  const hash = sha256(pdf);
  const done = await db`update contract_requests set labb_signer_id = ${admin.id}, labb_signer_name = ${admin.name}, labb_signer_title = ${title},
      labb_signed_at = ${labb.at}, labb_ip = ${ip}, signed_sha256 = ${hash}
    where id = ${r.id} and labb_signed_at is null returning id`;
  if (!done.length) return { error: "Labb already countersigned this agreement." };
  const note = `Fully executed ${labb.at.toISOString()} (partner ${partner.name}, Labb ${admin.name}). SHA-256 ${hash}`;
  if (r.member_contract_id) {
    await db`update member_contracts set filename = ${fileName}, size_bytes = ${pdf.length}, data = ${Buffer.from(pdf)}, note = ${note}, uploaded_by = ${admin.id}
      where id = ${r.member_contract_id}`;
  } else {
    const [c] = await db<{ id: string }[]>`insert into member_contracts (member_id, filename, content_type, size_bytes, data, note, uploaded_by)
      values (${r.member_id}, ${fileName}, 'application/pdf', ${pdf.length}, ${Buffer.from(pdf)}, ${note}, ${admin.id}) returning id`;
    await db`update contract_requests set member_contract_id = ${c.id} where id = ${r.id}`;
  }
  const attachments = [{ filename: fileName, content: Buffer.from(pdf), type: "application/pdf" }];
  await sendMail(
    r.sent_to,
    "Your Labb Channel Partner Program agreement is fully executed",
    emailLayout("Welcome to the Channel Partner Program", `<p>Hi ${esc(partner.name.split(" ")[0])},</p><p>Labb has countersigned your ${esc(r.title)} for <strong>${esc(partner.company)}</strong>. The agreement is effective ${esc(longDate(labb.at))}, and the fully executed copy is attached for your records.</p><p>Questions? Write to ${cppEmail}.</p>`),
    `Labb has countersigned your ${r.title} for ${partner.company}. It is effective ${longDate(labb.at)}. The fully executed copy is attached. Questions? ${cppEmail}`,
    { replyTo: cppEmail, attachments },
  );
  await sendMail(
    labbInbox(),
    `CPP agreement fully executed: ${partner.company}`,
    emailLayout("CPP agreement fully executed", `<p>${esc(admin.name)} countersigned the ${esc(r.title)} for <strong>${esc(partner.company)}</strong>. Effective ${esc(longDate(labb.at))}. The executed copy is attached and saved on the member's record.</p>`, { href: absoluteUrl(`/admin/members/${r.member_id}`), label: "Open the member" }),
    `${admin.name} countersigned the ${r.title} for ${partner.company}. Effective ${longDate(labb.at)}.`,
    { attachments },
  );
  return { ok: true, company: partner.company };
}

const labbInbox = () => (process.env.CPP_LEAD_TO_EMAIL ? process.env.CPP_LEAD_TO_EMAIL.split(",") : [cppEmail]);

async function originalPdf(r: SignRequest) {
  const t = await templatePdf(r.template_id);
  if (!t) throw new Error("template missing");
  const original = new Uint8Array(t.data);
  if (sha256(original) !== r.tsha) throw new Error("template changed");
  return original;
}

// The exact PDF that was sent, with the partner's details and the signatures written into the blanks
// the template maps, a footer on every page and a signature and audit page at the end.
async function buildPdf(original: Uint8Array, r: SignRequest, p: Partner, labb: Labb | null) {
  const doc = await PDFDocument.load(original, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const script = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const ink = rgb(0.25, 0.29, 0.32);
  const blue = rgb(0.1, 0.16, 0.36);
  const pages = doc.getPages();
  const iso = (d: Date) => d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");

  const fit = (text: string, f: typeof font, size: number, w: number) => {
    let s = size;
    while (s > 6 && f.widthOfTextAtSize(text, s) > w) s -= 0.5;
    return s;
  };
  const put = (key: string, text: string, opts: { f?: typeof font; color?: ReturnType<typeof rgb>; scale?: number } = {}) => {
    const fl = r.fields?.find((x) => x.key === key);
    const page = fl && pages[fl.page];
    if (!fl || !page || !text) return null;
    const f = opts.f ?? font;
    const size = fit(text, f, fl.size * (opts.scale ?? 1), fl.w);
    page.drawText(text, { x: fl.x, y: fl.y, size, font: f, color: opts.color ?? blue });
    return { fl, page };
  };
  const sign = (key: string, name: string, caption: string) => {
    const at = put(key, name, { f: script, scale: 1.75 });
    if (at) at.page.drawText(caption.slice(0, 80), { x: at.fl.x, y: at.fl.y - 13, size: 7.5, font, color: ink });
  };

  put("partner_name", p.company);
  put("partner_state", p.state);
  sign("partner_sig", p.name, [p.name, p.title].filter(Boolean).join(", "));
  put("partner_date", longDate(p.at));
  if (labb) {
    sign("labb_sig", labb.name, [labb.name, labb.title].filter(Boolean).join(", "));
    put("labb_date", longDate(labb.at));
  }

  const footer = labb
    ? `Signed electronically by ${p.name} (${p.company}) ${iso(p.at)} and by ${labb.name} for Labb ${iso(labb.at)} · Ref CPP-${r.id}`
    : `Signed electronically by ${p.name} for ${p.company} on ${iso(p.at)} · Labb ref CPP-${r.id}`;
  for (const pg of pages) {
    const { width } = pg.getSize();
    pg.drawText(footer.slice(0, 160), { x: 36, y: 14, size: 6.5, font, color: rgb(0.45, 0.47, 0.5), maxWidth: width - 72 });
  }

  const page = doc.addPage([612, 792]);
  let y = 740;
  const line = (text: string, o: { size?: number; f?: typeof font; gap?: number; color?: ReturnType<typeof rgb> } = {}) => {
    const size = o.size ?? 10;
    page.drawText(text, { x: 56, y, size, font: o.f ?? font, color: o.color ?? ink, maxWidth: 500, lineHeight: size * 1.35 });
    y -= o.gap ?? size * 1.9;
  };
  page.drawRectangle({ x: 0, y: 772, width: 612, height: 20, color: rgb(0.81, 0.455, 0.235) });
  line("Signature and audit certificate", { size: 18, f: bold, gap: 30 });
  line(`${r.title} · version ${r.version}`, { size: 11, f: bold });
  line(labb ? `Fully executed. Effective date: ${longDate(labb.at)}.` : "Signed by the partner. Awaiting Labb countersignature.", { gap: 30 });

  const block = (label: string, name: string, caption: string, at: Date) => {
    line(label, { size: 8, f: bold, gap: 14, color: rgb(0.45, 0.47, 0.5) });
    page.drawText(name, { x: 56, y: y - 12, size: 26, font: script, color: blue });
    y -= 22;
    page.drawLine({ start: { x: 56, y }, end: { x: 330, y }, thickness: 0.8, color: ink });
    y -= 16;
    line(caption, { f: bold, gap: 14 });
    line(`Signed: ${iso(at)}`, { gap: 26 });
  };
  block(`PARTNER: ${p.company.toUpperCase()}`.slice(0, 90), p.name, [p.name, p.title].filter(Boolean).join(", "), p.at);
  if (labb) block("RAMSEY DIAGNOSTICS CORPORATION D/B/A LABB", labb.name, [labb.name, labb.title].filter(Boolean).join(", "), labb.at);

  line("AUDIT TRAIL", { size: 8, f: bold, gap: 16, color: rgb(0.45, 0.47, 0.5) });
  const rows: [string, string][] = [
    ["Reference", `CPP-${r.id}`],
    ["Signing link sent to", r.sent_to],
    ["Partner IP address", p.ip],
    ["Partner device", p.agent.slice(0, 110)],
    ["Electronic consent", "Partner agreed to use electronic records and signatures (ESIGN Act, UETA)"],
    ["Intent to sign", "Partner reviewed the agreement, confirmed authority to sign, typed their name and clicked Sign"],
    ...(labb ? ([["Labb countersignature", `${labb.name}, signed in to the Labb admin, IP ${labb.ip}`]] as [string, string][]) : []),
    ["Original document SHA-256", r.tsha],
  ];
  for (const [k, v] of rows) {
    page.drawText(k, { x: 56, y, size: 9, font: bold, color: ink });
    page.drawText(v, { x: 210, y, size: 9, font, color: ink, maxWidth: 346, lineHeight: 12 });
    y -= v.length > 70 ? 28 : 18;
  }
  y -= 8;
  line("The SHA-256 fingerprint identifies the exact agreement that was presented for signature. Any change to that", { size: 8, gap: 11 });
  line("document produces a different fingerprint. Labb keeps this signed copy on the member's record.", { size: 8 });
  return doc.save();
}

// A CPP application becomes a Prospect on the member list (no login until Labb invites them).
export async function addCppProspect(lead: {
  email: string; firstName?: string; lastName?: string; company?: string; legalName?: string; phone?: string; city?: string; state?: string;
}) {
  const db = sql();
  const email = lead.email.trim().toLowerCase();
  const [existing] = await db<{ id: string }[]>`select id from members where lower(email) = ${email}`;
  if (existing) return existing.id;
  const { uniqueUsername } = await import("@/lib/courses");
  const username = await uniqueUsername(email);
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.company || email;
  const [m] = await db<{ id: string }[]>`
    insert into members (username, email, name, clinic, legal_name, phone, city, state, role, status, cpp_status, cpp_status_changed_at)
    values (${username}, ${email}, ${name}, ${lead.company || null}, ${lead.legalName || null}, ${lead.phone || null}, ${lead.city || null},
      ${lead.state || null}, 'member', 'invited', 'prospect', now())
    returning id`;
  await db`insert into member_events (member_id, event, detail) values (${m.id}, 'prospect_created', 'CPP application on the website')`;
  return m.id;
}

// Welcome email sent to everyone who submits the CPP agreement request form (private/emails/cpp-request-welcome.html).
export async function sendCppRequestWelcome(email: string) {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { toText } = await import("@/lib/broadcast");
  const html = await readFile(join(process.cwd(), "private", "emails", "cpp-request-welcome.html"), "utf8");
  return sendMail(email, "Thanks for your CPP request: what Labb provides members", html, toText(html), { replyTo: cppEmail });
}
