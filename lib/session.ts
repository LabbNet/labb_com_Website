// Signed-cookie access control. Works in the proxy (edge) and in route handlers.
// Two levels today:
//   lead   - visitor submitted a lead form; unlocks gated downloads
//   member - CPP member / client; unlocks /library (and later the LMS and member pricing)
// When the learning platform and Stripe accounts go live, swap verifyMemberLogin()
// for the real identity provider and keep this cookie as the site session.

export const COOKIE = "labb_access";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export type Access = { email?: string; lead?: boolean; member?: boolean; exp: number };

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

// Interim member check: a shared library password (same model as the current Shopify library).
// Replace with LMS / identity provider lookups when available.
export function verifyMemberLogin(password: string) {
  const expected = process.env.LIBRARY_PASSWORD;
  if (!expected) return false;
  if (password.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < password.length; i++) diff |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
