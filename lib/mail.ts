import "server-only";

// Transactional email. Providers are tried in order:
//   1. SendGrid (SENDGRID_API_KEY)
//   2. Google Workspace SMTP (SMTP_USER + SMTP_PASS; SMTP_HOST defaults to smtp.gmail.com)
//   3. Resend (RESEND_API_KEY, legacy)
// Returns false (and logs) when nothing is configured or every provider fails,
// so callers can fall back to showing a copyable link to the admin.

type MailOpts = { replyTo?: string; from?: string };

const defaultFrom = () => process.env.MAIL_FROM || process.env.LEAD_FROM_EMAIL || "Labb <info@labb.com>";

// "Labb Website <leads@labb.com>" -> { name, email }
function parseFrom(from: string) {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || undefined, email: m[2] } : { email: from.trim() };
}

export function mailProviders() {
  return [
    process.env.SENDGRID_API_KEY && "SendGrid",
    process.env.SMTP_USER && process.env.SMTP_PASS && "Google Workspace (SMTP)",
    process.env.RESEND_API_KEY && "Resend",
  ].filter(Boolean) as string[];
}

async function viaSendGrid(to: string[], subject: string, html: string, text: string, o: MailOpts) {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: to.map((email) => ({ email })) }],
      from: parseFrom(o.from || defaultFrom()),
      ...(o.replyTo ? { reply_to: { email: o.replyTo } } : {}),
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });
  if (!res.ok) throw new Error(`SendGrid ${res.status}: ${await res.text()}`);
}

async function viaSmtp(to: string[], subject: string, html: string, text: string, o: MailOpts) {
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({ from: o.from || defaultFrom(), to, replyTo: o.replyTo, subject, html, text });
}

async function viaResend(to: string[], subject: string, html: string, text: string, o: MailOpts) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: o.from || defaultFrom(), to, reply_to: o.replyTo, subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export async function sendMail(to: string | string[], subject: string, html: string, text: string, opts: MailOpts = {}): Promise<boolean> {
  const list = (Array.isArray(to) ? to : to.split(",")).map((s) => s.trim()).filter(Boolean);
  if (!list.length) return false;
  const attempts: [boolean, typeof viaSendGrid, string][] = [
    [Boolean(process.env.SENDGRID_API_KEY), viaSendGrid, "SendGrid"],
    [Boolean(process.env.SMTP_USER && process.env.SMTP_PASS), viaSmtp, "SMTP"],
    [Boolean(process.env.RESEND_API_KEY), viaResend, "Resend"],
  ];
  let tried = false;
  for (const [enabled, send, name] of attempts) {
    if (!enabled) continue;
    tried = true;
    try {
      await send(list, subject, html, text, opts);
      return true;
    } catch (e) {
      console.error(`[mail] ${name} failed`, e instanceof Error ? e.message : e);
    }
  }
  if (!tried) console.warn(`[mail] No email provider configured. Would send "${subject}" to ${list.join(", ")}`);
  return false;
}

export function emailLayout(title: string, bodyHtml: string, cta?: { href: string; label: string }) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#404951;max-width:560px;margin:0 auto">
  <div style="border-bottom:4px solid #CF743C;padding:16px 0;font-size:22px;font-weight:bold">Labb</div>
  <h1 style="font-size:20px;margin:24px 0 12px">${title}</h1>
  ${bodyHtml}
  ${cta ? `<p style="margin:28px 0"><a href="${cta.href}" style="background:#CF743C;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;display:inline-block">${cta.label}</a></p><p style="font-size:12px;color:#5f6a74">Or paste this link into your browser:<br>${cta.href}</p>` : ""}
  <p style="font-size:12px;color:#5f6a74;border-top:1px solid #dfe5e5;padding-top:12px;margin-top:32px">Ramsey Diagnostics Corporation d/b/a Labb, 2115 Granby Street, Norfolk, VA 23517, info@labb.com</p>
</div>`;
}
