/**
 * Test infrastructure: the isolated `blog_test` database for the API integration tests (*.it.test.ts).
 *
 * - loads the root .env (same pattern as drizzle.config.ts), requires TEST_DATABASE_URL and refuses to run
 *   against the dev database;
 * - creates the database if it is missing, applies the committed migrations;
 * - `truncatePosts()` / `insertPost()` / `query()` are raw `pg`, so a test never goes through the code under test.
 *
 * Unit tests (*.test.ts) must not import this file.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const rootEnv = new URL('../../../../.env', import.meta.url);
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** Absolute path of the repository root (cwd for child processes such as `pnpm --filter @blog/api db:seed`). */
export const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

/** Validated TEST_DATABASE_URL. Throws if it is missing, equals DATABASE_URL, or does not look like a test DB. */
export function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Add TEST_DATABASE_URL=postgres://blog:blog@localhost:5433/blog_test to the root .env.',
    );
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL must not equal DATABASE_URL: the tests truncate tables.');
  }
  if (!/test/i.test(databaseName(url))) {
    throw new Error(`TEST_DATABASE_URL must point at a database whose name contains "test" (got "${databaseName(url)}").`);
  }
  return url;
}

function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}

/** Same server, other database name. */
export function withDatabaseName(url: string, name: string): string {
  const next = new URL(url);
  next.pathname = `/${name}`;
  return next.toString();
}

/** Creates the database named in `url` if it does not exist, by connecting to the `postgres` database. */
export async function ensureDatabase(url: string): Promise<void> {
  const name = databaseName(url);
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`Unsupported test database name "${name}"`);
  const admin = new pg.Client({ connectionString: withDatabaseName(url, 'postgres') });
  await admin.connect();
  try {
    const found = await admin.query('select 1 from pg_database where datname = $1', [name]);
    if (found.rowCount === 0) await admin.query(`create database "${name}"`);
  } finally {
    await admin.end();
  }
}

/** Drops the database named in `url` if it exists. Refuses anything that is not a test database. */
export async function dropDatabase(url: string): Promise<void> {
  const name = databaseName(url);
  if (!/^[A-Za-z0-9_]+$/.test(name) || !/test/i.test(name)) throw new Error(`Refusing to drop "${name}"`);
  const admin = new pg.Client({ connectionString: withDatabaseName(url, 'postgres') });
  await admin.connect();
  try {
    await admin.query(`drop database if exists "${name}" with (force)`);
  } finally {
    await admin.end();
  }
}

let pool: pg.Pool | undefined;
let ready: Promise<void> | undefined;

function getPool(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: getTestDatabaseUrl(), max: 4 });
  return pool;
}

/** Creates `blog_test` if needed and applies the migrations in apps/api/drizzle. Idempotent; call from beforeAll. */
export function setupTestDatabase(): Promise<void> {
  ready ??= (async () => {
    const url = getTestDatabaseUrl();
    await ensureDatabase(url);
    await migrate(drizzle({ client: getPool(), casing: 'snake_case' }), { migrationsFolder });
  })();
  return ready;
}

/** Ends the helper's pool; call from afterAll. */
export async function closeTestDb(): Promise<void> {
  const current = pool;
  pool = undefined;
  ready = undefined;
  await current?.end();
}

/** Raw SQL against the test database, for assertions and fixtures. */
export async function query<Row extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<Row[]> {
  const result = await getPool().query<Row>(text, params);
  return result.rows;
}

/**
 * Empties `posts`. A no-op while the table does not exist yet, so that a missing table surfaces as a failure of the
 * code under test (the migration, the seed) and not as a setup crash.
 */
export async function truncatePosts(): Promise<void> {
  const [found] = await query<{ present: string | null }>(`select to_regclass('public.posts') as present`);
  if (found?.present) await query('truncate table posts');
}

/** Column names are the snake_case names of the `posts` table (plan § Contract, DB shape). */
export interface TestPostRow {
  id?: string;
  slug: string;
  title?: string;
  excerpt?: string;
  body?: string;
  author_name?: string;
  tags?: string[];
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  status?: 'draft' | 'published';
  /** Defaults to one day ago for a published row and to null for a draft. */
  published_at?: Date | string | null;
}

/** Inserts one row; every column not given gets a valid default. Returns the stored id and slug. */
export async function insertPost(row: TestPostRow): Promise<{ id: string; slug: string }> {
  const status = row.status ?? 'published';
  const values: Record<string, unknown> = {
    slug: row.slug,
    title: row.title ?? `Title of ${row.slug}`,
    excerpt: row.excerpt ?? `Excerpt of ${row.slug}`,
    body: row.body ?? 'Some body text.',
    author_name: row.author_name ?? 'Test Author',
    tags: row.tags ?? [],
    cover_image_url: row.cover_image_url ?? null,
    cover_image_alt: row.cover_image_alt ?? null,
    status,
    published_at: 'published_at' in row ? row.published_at : status === 'published' ? new Date(Date.now() - 86_400_000) : null,
  };
  if (row.id !== undefined) values.id = row.id;

  const columns = Object.keys(values);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const [inserted] = await query<{ id: string; slug: string }>(
    `insert into posts (${columns.map((c) => `"${c}"`).join(', ')}) values (${placeholders.join(', ')}) returning id, slug`,
    columns.map((c) => values[c]),
  );
  if (!inserted) throw new Error(`insertPost(${row.slug}) returned no row`);
  return inserted;
}
