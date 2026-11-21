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

export type SignRequest = {
  id: string; status: string; expires_at: Date; signed_at: Date | null; sent_to: string; template_id: string;
  title: string; version: string; tsha: string; member_id: string; name: string; clinic: string | null; legal_name: string | null;
  member_contract_id: string | null;
};

export async function requestByToken(token: string): Promise<SignRequest | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const [r] = await sql()<SignRequest[]>`
    select r.id, r.status, r.expires_at, r.signed_at, r.sent_to, r.template_id, t.title, t.version, t.sha256 as tsha,
      m.id as member_id, m.name, m.clinic, m.legal_name, r.member_contract_id
    from contract_requests r join contract_templates t on t.id = r.template_id join members m on m.id = r.member_id
    where r.token_hash = ${sha256(Buffer.from(token))}`;
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

type Signer = { name: string; title: string; company: string; ip: string; agent: string };

export async function signContract(r: SignRequest, s: Signer) {
  const db = sql();
  const t = await templatePdf(r.template_id);
  if (!t) throw new Error("template missing");
  const original = new Uint8Array(t.data);
  if (sha256(original) !== r.tsha) throw new Error("template changed");
  const signedAt = new Date();
  const pdf = await stampPdf(original, r, s, signedAt);
  const fileName = `CPP Agreement v${r.version} - ${s.company}.pdf`.replace(/[^\w .()-]/g, "").slice(0, 120);
  const signedHash = sha256(pdf);

  // Claim the request first so a double submit can't sign twice.
  const claimed = await db`update contract_requests set status = 'signed', signed_at = ${signedAt}, signer_name = ${s.name},
      signer_title = ${s.title}, signer_company = ${s.company}, signer_ip = ${s.ip}, signer_agent = ${s.agent}, signed_sha256 = ${signedHash}
    where id = ${r.id} and status in ('sent', 'viewed') and expires_at > now() returning id`;
  if (!claimed.length) return { error: "This link has already been used or has expired." };
  const [c] = await db<{ id: string }[]>`
    insert into member_contracts (member_id, filename, content_type, size_bytes, data, note, uploaded_by)
    values (${r.member_id}, ${fileName}, 'application/pdf', ${pdf.length}, ${Buffer.from(pdf)},
      ${`Signed electronically ${signedAt.toISOString()} by ${s.name}. SHA-256 ${signedHash}`}, null)
    returning id`;
  await db`update contract_requests set member_contract_id = ${c.id} where id = ${r.id}`;
  await db`update members set legal_name = ${s.company}, updated_at = now() where id = ${r.member_id}`;
  await db`insert into member_events (member_id, event, detail, ip) values (${r.member_id}, 'contract_signed', ${`${r.title} v${r.version} signed by ${s.name}`}, ${s.ip})`;

  const attachments = [{ filename: fileName, content: Buffer.from(pdf), type: "application/pdf" }];
  const when = signedAt.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "long", timeStyle: "short" }) + " ET";
  await sendMail(
    r.sent_to,
    "Your signed Labb Channel Partner Program agreement",
    emailLayout("Thank you for signing", `<p>Hi ${esc(s.name.split(" ")[0])},</p><p>Your signed ${esc(r.title)} for <strong>${esc(s.company)}</strong> is attached for your records (signed ${esc(when)}).</p><p>Labb will be in touch about next steps. Questions? Write to ${cppEmail}.</p>`),
    `Your signed ${r.title} for ${s.company} is attached (signed ${when}). Questions? ${cppEmail}`,
    { replyTo: cppEmail, attachments },
  );
  const to = process.env.CPP_LEAD_TO_EMAIL ? process.env.CPP_LEAD_TO_EMAIL.split(",") : [cppEmail];
  await sendMail(
    to,
    `CPP agreement signed: ${s.company}`,
    emailLayout("CPP agreement signed", `<p><strong>${esc(s.name)}</strong>${s.title ? `, ${esc(s.title)}` : ""} signed the ${esc(r.title)} (version ${esc(r.version)}) for <strong>${esc(s.company)}</strong> on ${esc(when)}.</p><p>The signed copy is attached and saved on the member's record.</p>`, { href: absoluteUrl(`/admin/members/${r.member_id}`), label: "Open the member" }),
    `${s.name} signed the ${r.title} v${r.version} for ${s.company} on ${when}. ${absoluteUrl(`/admin/members/${r.member_id}`)}`,
    { attachments },
  );
  return { ok: true };
}

// The exact PDF that was sent, plus a footer on every page and a signature and audit page at the end.
async function stampPdf(original: Uint8Array, r: SignRequest, s: Signer, at: Date) {
  const doc = await PDFDocument.load(original, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const script = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const ink = rgb(0.25, 0.29, 0.32);
  const iso = at.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  const footer = `Signed electronically by ${s.name} for ${s.company} on ${iso} · Labb ref CPP-${r.id}`;
  for (const p of doc.getPages()) {
    const { width } = p.getSize();
    p.drawText(footer.slice(0, 140), { x: 36, y: 14, size: 7, font, color: rgb(0.45, 0.47, 0.5), maxWidth: width - 72 });
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
  line("Between Ramsey Diagnostics Corporation d/b/a Labb and the party signing below.", { gap: 30 });

  line("SIGNED BY", { size: 8, f: bold, gap: 14, color: rgb(0.45, 0.47, 0.5) });
  page.drawText(s.name, { x: 56, y: y - 12, size: 28, font: script, color: rgb(0.1, 0.16, 0.36) });
  y -= 22;
  page.drawLine({ start: { x: 56, y }, end: { x: 330, y }, thickness: 0.8, color: ink });
  y -= 16;
  line(`${s.name}${s.title ? `, ${s.title}` : ""}`, { f: bold, gap: 14 });
  line(`For: ${s.company}`, { gap: 14 });
  line(`Signed: ${iso}`, { gap: 30 });

  line("AUDIT TRAIL", { size: 8, f: bold, gap: 16, color: rgb(0.45, 0.47, 0.5) });
  const rows: [string, string][] = [
    ["Reference", `CPP-${r.id}`],
    ["Signing link sent to", r.sent_to],
    ["Signer IP address", s.ip],
    ["Signer device", s.agent.slice(0, 110)],
    ["Electronic consent", "Signer agreed to use electronic records and signatures (ESIGN Act, UETA)"],
    ["Intent to sign", "Signer reviewed the agreement, confirmed authority to sign, typed their name and clicked Sign"],
    ["Original document SHA-256", r.tsha],
  ];
  for (const [k, v] of rows) {
    page.drawText(k, { x: 56, y, size: 9, font: bold, color: ink });
    page.drawText(v, { x: 210, y, size: 9, font, color: ink, maxWidth: 346, lineHeight: 12 });
    y -= v.length > 70 ? 28 : 18;
  }
  y -= 10;
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
