import { checkPassword, currentMember, hashPassword, logEvent, passwordProblem, sameOrigin, startSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { go } from "@/lib/http";

export async function POST(req: Request) {
  if (!(await sameOrigin())) return go(req, "/members/account?error=1");
  const m = await currentMember();
  if (!m) return go(req, "/login?next=/members/account");
  const fd = await req.formData();
  const current = String(fd.get("current") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  const [row] = await sql()<{ password_hash: string }[]>`select password_hash from members where id = ${m.id}`;
  if (!(await checkPassword(current, row.password_hash))) return go(req, "/members/account?error=current");
  if (passwordProblem(password)) return go(req, "/members/account?error=weak");
  if (password !== confirm) return go(req, "/members/account?error=match");

  const [updated] = await sql()<{ id: string; role: "member" | "admin"; session_version: number; email: string }[]>`
    update members set password_hash = ${await hashPassword(password)}, session_version = session_version + 1, updated_at = now()
    where id = ${m.id} returning id, role, session_version, email`;
  await logEvent(m.id, "password_changed");
  await startSession(updated); // other devices are signed out
  return go(req, "/members/account?changed=1");
}
