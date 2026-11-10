import "server-only";
import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { sql } from "@/lib/db";
import { COOKIE, cookieOptions, sign, verify } from "@/lib/session";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

export type Member = {
  id: string;
  username: string;
  email: string;
  name: string;
  clinic: string | null;
  role: "member" | "admin";
  status: "invited" | "active" | "disabled";
  session_version: number;
  created_at: Date;
  last_login_at: Date | null;
};

// ---- Passwords (scrypt, per-user salt) ----
const N = 16384, R = 8, P = 1, LEN = 64;

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, LEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function checkPassword(pw: string, stored: string | null) {
  if (!stored) return false;
  const [alg, n, r, p, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(pw, Buffer.from(saltB64, "base64"), expected.length, { N: +n, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export function passwordProblem(pw: string) {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "Use 200 characters or fewer.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Use at least one letter and one number.";
  return null;
}

// Equalize timing when the username doesn't exist.
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");
export const dummyCheck = (pw: string) => checkPassword(pw, DUMMY_HASH);

// ---- One-time tokens (invite / reset) ----
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createToken(memberId: string, purpose: "invite" | "reset") {
  const token = randomBytes(32).toString("base64url");
  const hours = purpose === "invite" ? 24 * 7 : 1;
  const db = sql();
  await db`update member_tokens set used_at = now() where member_id = ${memberId} and purpose = ${purpose} and used_at is null`;
  await db`insert into member_tokens (token_hash, member_id, purpose, expires_at) values (${sha(token)}, ${memberId}, ${purpose}, now() + ${hours + " hours"}::interval)`;
  return token;
}

export async function findToken(token: string, purpose: "invite" | "reset") {
  if (!token || token.length > 100) return null;
  const rows = await sql()<(Member & { token_hash: string })[]>`
    select m.*, t.token_hash from member_tokens t join members m on m.id = t.member_id
    where t.token_hash = ${sha(token)} and t.purpose = ${purpose} and t.used_at is null and t.expires_at > now() and m.status <> 'disabled'`;
  return rows[0] || null;
}

export async function useToken(token: string) {
  await sql()`update member_tokens set used_at = now() where token_hash = ${sha(token)}`;
}

// ---- Events ----
export async function logEvent(memberId: string | null, event: string, detail?: string, actorId?: string | null) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  await sql()`insert into member_events (member_id, actor_id, event, detail, ip) values (${memberId}, ${actorId ?? null}, ${event}, ${detail ?? null}, ${ip})`;
}

// ---- Sessions ----
// The signed cookie carries member id, role and session_version. Every protected page re-checks the
// database, so disabling a member or changing a password signs them out everywhere immediately.
export async function startSession(m: Pick<Member, "id" | "role" | "session_version" | "email">) {
  const jar = await cookies();
  jar.set(COOKIE, await sign({ mid: m.id, sv: m.session_version, role: m.role, member: true, lead: true, email: m.email }), cookieOptions);
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentMember(): Promise<Member | null> {
  const access = await verify((await cookies()).get(COOKIE)?.value);
  if (!access?.mid) return null;
  const rows = await sql()<Member[]>`select * from members where id = ${access.mid}`;
  const m = rows[0];
  if (!m || m.status !== "active" || m.session_version !== access.sv) return null;
  return m;
}

// ---- Login rate limiting (per instance) ----
const attempts = new Map<string, number[]>();
export function tooManyAttempts(key: string, max = 8, windowMs = 15 * 60_000) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < windowMs);
  attempts.set(key, list);
  return list.length >= max;
}
export function recordAttempt(key: string) {
  attempts.set(key, [...(attempts.get(key) || []), Date.now()]);
}
export function clearAttempts(key: string) {
  attempts.delete(key);
}

// ---- Same-origin check for form posts ----
// Behind Render's proxy the Host header seen by the app can be the internal address, so compare the
// browser's Origin against every known public host: forwarded host, Host, the site URL, Render's
// external hostname, labb.com and ALLOWED_HOSTS.
export async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const site = h.get("sec-fetch-site");
  // Browsers send "Origin: null" when the page's referrer policy is no-referrer.
  // Fall back to Fetch Metadata, which the browser sets and pages cannot forge.
  if (!origin || origin === "null") {
    if (site === "same-origin" || site === "none") return true;
    console.warn(`[auth] blocked form post: origin=${origin ?? "missing"} sec-fetch-site=${site ?? "missing"}`);
    return false;
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    console.warn(`[auth] blocked form post: unparsable origin=${origin}`);
    return false;
  }
  const allowed = new Set<string>(["labb.com", "www.labb.com"]);
  const add = (v?: string | null) => v && v.split(",").forEach((x) => x.trim() && allowed.add(x.trim().toLowerCase()));
  add(h.get("x-forwarded-host"));
  add(h.get("host"));
  add(process.env.RENDER_EXTERNAL_HOSTNAME);
  add(process.env.ALLOWED_HOSTS);
  try {
    if (process.env.NEXT_PUBLIC_SITE_URL) add(new URL(process.env.NEXT_PUBLIC_SITE_URL).host);
  } catch {}
  if (allowed.has(originHost)) return true;
  console.warn(`[auth] blocked cross-site form post: origin=${originHost} allowed=${[...allowed].join(" ")}`);
  return false;
}

export const USERNAME_RE = /^[a-z0-9._-]{3,40}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
