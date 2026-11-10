import { checkPassword, clearAttempts, dummyCheck, logEvent, recordAttempt, sameOrigin, startSession, tooManyAttempts, type Member } from "@/lib/auth";
import { dbConfigured, sql } from "@/lib/db";
import { field, go } from "@/lib/http";

export async function POST(req: Request) {
  if (!dbConfigured) return go(req, "/login?error=unavailable");
  if (!(await sameOrigin())) return go(req, "/login?error=1");
  const fd = await req.formData();
  const login = field(fd, "username", 160).toLowerCase();
  const password = String(fd.get("password") ?? "").slice(0, 200);
  const next = field(fd, "next", 300) || "/members";
  const back = `/login?next=${encodeURIComponent(next)}`;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${ip}|${login}`;
  if (tooManyAttempts(key) || tooManyAttempts(ip, 30)) return go(req, `${back}&error=locked`);

  const rows = await sql()<(Member & { password_hash: string | null })[]>`
    select * from members where lower(username) = ${login} or lower(email) = ${login} limit 1`;
  const m = rows[0];
  const ok = m ? await checkPassword(password, m.password_hash) : await dummyCheck(password);

  if (!m || !ok || m.status !== "active") {
    recordAttempt(key);
    recordAttempt(ip);
    if (m) await logEvent(m.id, "login_failed", m.status !== "active" ? `status ${m.status}` : undefined);
    return go(req, `${back}&error=1`);
  }

  clearAttempts(key);
  await sql()`update members set last_login_at = now() where id = ${m.id}`;
  await logEvent(m.id, "login");
  await startSession(m);
  return go(req, m.role === "admin" && next === "/members" ? "/members" : next);
}
