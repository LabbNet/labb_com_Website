// Applies db/migrations/*.sql in order, once each. Runs automatically before `npm start` on Render.
// Usage: DATABASE_URL=... node scripts/migrate.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set, skipping (member accounts disabled).");
  process.exit(0);
}
const host = new URL(url).hostname;
const local = host === "localhost" || host === "127.0.0.1" || !host.includes(".");
const sql = postgres(url, { max: 1, ssl: local ? false : "require", onnotice: () => {} });
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");

try {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    const body = readFileSync(join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`[migrate] applied ${file}`);
  }
  console.log("[migrate] up to date");

  // First-admin bootstrap: if ADMIN_EMAIL is set and no admin exists yet, create one and print a
  // one-time setup link (7 days) to the service logs. Does nothing once an admin exists.
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (adminEmail) {
    const [{ n }] = await sql`select count(*)::int as n from members where role = 'admin'`;
    if (n === 0) {
      const { createHash, randomBytes } = await import("node:crypto");
      const name = process.env.ADMIN_NAME || adminEmail.split("@")[0];
      const username = (process.env.ADMIN_USERNAME || adminEmail.split("@")[0]).toLowerCase().replace(/[^a-z0-9._-]/g, "");
      const [m] = await sql`insert into members (username, email, name, role) values (${username}, ${adminEmail}, ${name}, 'admin')
        on conflict ((lower(email))) do update set role = 'admin' returning id`;
      const token = randomBytes(32).toString("base64url");
      await sql`insert into member_tokens (token_hash, member_id, purpose, expires_at)
        values (${createHash("sha256").update(token).digest("hex")}, ${m.id}, 'invite', now() + interval '7 days')`;
      const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || "https://labb.com").replace(/\/$/, "");
      console.log(`[bootstrap] Admin ${username} created. Setup link (7 days): ${base}/account/setup?token=${token}`);
    }
  }
} catch (e) {
  console.error("[migrate] failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
