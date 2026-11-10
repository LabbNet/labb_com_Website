import postgres from "postgres";

// Postgres connection (Render Postgres in production). DATABASE_URL is required for member accounts.
declare global {
  // eslint-disable-next-line no-var
  var __labbSql: ReturnType<typeof postgres> | undefined;
}

export const dbConfigured = Boolean(process.env.DATABASE_URL);

export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!globalThis.__labbSql) {
    const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
    globalThis.__labbSql = postgres(process.env.DATABASE_URL, {
      max: 5,
      idle_timeout: 20,
      ssl: local ? false : "require",
    });
  }
  return globalThis.__labbSql;
}
