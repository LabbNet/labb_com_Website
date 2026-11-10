import { findToken, hashPassword, logEvent, passwordProblem, sameOrigin, startSession, useToken } from "@/lib/auth";
import { dbConfigured, sql } from "@/lib/db";
import { go } from "@/lib/http";

// Handles both first-time account setup (invite) and password reset.
export async function POST(req: Request) {
  if (!dbConfigured || !(await sameOrigin())) return go(req, "/login?error=1");
  const fd = await req.formData();
  const token = String(fd.get("token") ?? "");
  const purpose = fd.get("purpose") === "reset" ? "reset" : "invite";
  const page = purpose === "reset" ? "/reset-password" : "/account/setup";
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  const m = await findToken(token, purpose);
  if (!m) return go(req, `${page}?error=expired`);
  const problem = passwordProblem(password);
  if (problem) return go(req, `${page}?token=${encodeURIComponent(token)}&error=weak`);
  if (password !== confirm) return go(req, `${page}?token=${encodeURIComponent(token)}&error=match`);

  const hash = await hashPassword(password);
  const [updated] = await sql()<{ id: string; role: "member" | "admin"; session_version: number; email: string }[]>`
    update members set password_hash = ${hash}, status = 'active', session_version = session_version + 1, updated_at = now(), last_login_at = now()
    where id = ${m.id} returning id, role, session_version, email`;
  await useToken(token);
  await logEvent(m.id, purpose === "reset" ? "password_reset" : "account_setup");
  await startSession(updated);
  return go(req, purpose === "reset" ? "/members?reset=1" : "/members?welcome=1");
}
