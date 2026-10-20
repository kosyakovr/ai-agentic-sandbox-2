/**
 * Ring 3 (infrastructure): the pg pool and the Drizzle instance. Built once, by the composition root.
 * Must not import the container or any module.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export type Database = ReturnType<typeof createDrizzle>;

function createDrizzle(pool: pg.Pool) {
  return drizzle({ client: pool, casing: 'snake_case' });
}

export function createDatabase(
  url: string,
  onPoolError: (err: Error) => void,
): { db: Database; close(): Promise<void> } {
  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
  // An idle client error would otherwise be an unhandled 'error' event and crash the process.
  pool.on('error', onPoolError);
  return { db: createDrizzle(pool), close: () => pool.end() };
}
