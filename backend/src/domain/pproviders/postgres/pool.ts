import pg from "pg";

let pool: pg.Pool | undefined;

/**
 * Shared connection pool for all Postgres-backed pProviders. Created lazily
 * from DATABASE_URL on first use.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set but Postgres persistence was requested.");
    }
    pool = new pg.Pool({
      connectionString,
      max: Number(process.env.PGPOOL_MAX ?? 2),
      idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT_MS ?? 5_000),
      connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECTION_TIMEOUT_MS ?? 10_000),
    });
  }
  return pool;
}
