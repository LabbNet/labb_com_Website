// Signed-cookie access control. Works in the proxy (edge) and in route handlers.
// Levels:
//   lead   - visitor submitted a lead form; unlocks gated downloads
//   member - signed in to a CPP member account (mid = member id, sv = session version, role)
// Member pages re-check the database on every request (lib/auth.ts currentMember).

export const COOKIE = "labb_access";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type Access = { email?: string; lead?: boolean; member?: boolean; mid?: string; sv?: number; role?: "member" | "admin"; exp: number };

const enc = new TextEncoder();

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (32+ chars)");
    return "dev-only-secret-change-me-dev-only-secret";
  }
  return s;
}

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  b.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function key() {
  return crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function sign(access: Omit<Access, "exp">): Promise<string> {
  const payload: Access = { ...access, exp: Math.floor(Date.now() / 1000) + MAX_AGE };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

export async function verify(token?: string | null): Promise<Access | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Access;
    if (data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};
