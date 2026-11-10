import { createToken, logEvent, recordAttempt, sameOrigin, tooManyAttempts } from "@/lib/auth";
import { dbConfigured, sql } from "@/lib/db";
import { field, go } from "@/lib/http";
import { emailLayout, sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";

// Always shows the same confirmation, whether or not the account exists.
export async function POST(req: Request) {
  if (!dbConfigured || !(await sameOrigin())) return go(req, "/forgot-password?sent=1");
  const fd = await req.formData();
  const login = field(fd, "username", 160).toLowerCase();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooManyAttempts(`forgot|${ip}`, 5)) return go(req, "/forgot-password?sent=1");
  recordAttempt(`forgot|${ip}`);

  const [m] = await sql()<{ id: string; email: string; name: string; status: string }[]>`
    select id, email, name, status from members where lower(username) = ${login} or lower(email) = ${login} limit 1`;
  if (m && m.status === "active") {
    const token = await createToken(m.id, "reset");
    const link = absoluteUrl(`/reset-password?token=${token}`);
    await sendMail(
      m.email,
      "Reset your Labb member password",
      emailLayout("Reset your password", `<p>Hi ${m.name.split(" ")[0]},</p><p>Use the button below to choose a new password for your Labb member account. The link works once and expires in 1 hour.</p><p>If you didn't ask for this, you can ignore this email.</p>`, { href: link, label: "Choose a new password" }),
      `Reset your Labb member password: ${link}\nThe link works once and expires in 1 hour.`,
    );
    await logEvent(m.id, "reset_requested");
  }
  return go(req, "/forgot-password?sent=1");
}
