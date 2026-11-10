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
const local = /localhost|127\.0\.0\.1/.test(url);
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
} catch (e) {
  console.error("[migrate] failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
