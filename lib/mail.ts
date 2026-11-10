// Transactional email via Resend. Returns false (and logs) when email isn't configured,
// so callers can fall back to showing a copyable link to the admin.
export async function sendMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[mail] RESEND_API_KEY not set. Would send "${subject}" to ${to}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM || process.env.LEAD_FROM_EMAIL || "Labb <info@labb.com>", to: [to], subject, html, text }),
  });
  if (!res.ok) {
    console.error("[mail] Resend error", res.status, await res.text());
    return false;
  }
  return true;
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
