import { checkPassword, clearAttempts, dummyCheck, logEvent, recordAttempt, sameOrigin, startSession, tooManyAttempts, type Member } from "@/lib/auth";
import { dbConfigured, sql } from "@/lib/db";
import { field, go, clientIp } from "@/lib/http";

export async function POST(req: Request) {
  if (!dbConfigured) return go(req, "/login?error=unavailable");
  if (!(await sameOrigin())) return go(req, "/login?error=1");
  const fd = await req.formData();
  const login = field(fd, "username", 160).toLowerCase();
  const password = String(fd.get("password") ?? "").slice(0, 200);
  const next = field(fd, "next", 300) || "/members";
  // The team sign-in (footer "Admin login") sends errors back to itself.
  const team = field(fd, "from", 10) === "team";
  const back = team ? "/admin-login?x=1" : `/login?next=${encodeURIComponent(next)}`;

  const ip = clientIp(req.headers);
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
  // Team sign-in: Labb admins go to the admin portal, read admins to their area, anyone else to their usual home.
  if (team) return go(req, m.role === "admin" ? "/admin/crm" : m.role === "reader" ? "/reads" : m.role === "learner" ? "/learn" : "/members");
  return go(req, m.role === "learner" && (next === "/members" || next.startsWith("/members/")) ? "/learn" : next);
}
