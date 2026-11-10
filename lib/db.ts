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
    // No SSL for local and Render internal hosts (e.g. dpg-xxxx-a, no dots); SSL for external URLs.
    const host = new URL(process.env.DATABASE_URL).hostname;
    const local = host === "localhost" || host === "127.0.0.1" || !host.includes(".");
    globalThis.__labbSql = postgres(process.env.DATABASE_URL, {
      max: 5,
      idle_timeout: 20,
      ssl: local ? false : "require",
    });
  }
  return globalThis.__labbSql;
}
