// Creates the first Labb admin account and prints a one-time setup link.
// Usage: DATABASE_URL=... SITE_URL=https://labb.com node scripts/create-admin.mjs you@labb.com "Your Name" [username]
import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

const [email, name, usernameArg] = process.argv.slice(2);
if (!process.env.DATABASE_URL || !email || !name) {
  console.error('Usage: DATABASE_URL=... node scripts/create-admin.mjs email "Full Name" [username]');
  process.exit(1);
}
const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: local ? false : "require" });
const username = (usernameArg || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9._-]/g, "");
const base = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://labb.com").replace(/\/$/, "");

try {
  let [m] = await sql`select id from members where lower(email) = ${email.toLowerCase()}`;
  if (m) {
    await sql`update members set role = 'admin', status = case when status = 'disabled' then 'invited' else status end where id = ${m.id}`;
    console.log(`Existing member ${email} is now an admin.`);
  } else {
    [m] = await sql`insert into members (username, email, name, role) values (${username}, ${email.toLowerCase()}, ${name}, 'admin') returning id`;
    console.log(`Created admin ${name} (${username}).`);
  }
  const token = randomBytes(32).toString("base64url");
  await sql`insert into member_tokens (token_hash, member_id, purpose, expires_at) values (${createHash("sha256").update(token).digest("hex")}, ${m.id}, 'invite', now() + interval '7 days')`;
  console.log(`Setup link (expires in 7 days):\n${base}/account/setup?token=${token}`);
} finally {
  await sql.end();
}
