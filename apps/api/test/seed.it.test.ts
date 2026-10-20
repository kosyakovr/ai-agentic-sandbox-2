/**
 * `pnpm --filter @blog/api db:seed` against a real Postgres (blog_test), run as a child process.
 * Oracles: plan § Test brief WP5.tests [T1] and [T2], spec AC-48, AC-49, AC-50, AC-51, AC-52, AC-53, A-16.
 */
import { execFile } from 'node:child_process';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/app.js';
import {
  closeTestDb,
  dropDatabase,
  ensureDatabase,
  getTestDatabaseUrl,
  insertPost,
  query,
  repoRoot,
  setupTestDatabase,
  truncatePosts,
  withDatabaseName,
} from './helpers/db.js';

interface SeedRun {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runSeed(options: { databaseUrl?: string; env?: Record<string, string> } = {}): Promise<SeedRun> {
  return new Promise((resolve) => {
    execFile(
      'pnpm',
      ['--filter', '@blog/api', 'db:seed'],
      {
        cwd: repoRoot,
        env: { ...process.env, DATABASE_URL: options.databaseUrl ?? getTestDatabaseUrl(), ...options.env },
        timeout: 90_000,
      },
      (error, stdout, stderr) => {
        const code = error && 'code' in error && typeof error.code === 'number' ? error.code : error ? 1 : 0;
        resolve({ exitCode: code, stdout, stderr });
      },
    );
  });
}

async function count(where: string): Promise<number> {
  const [row] = await query<{ n: string }>(`select count(*)::text as n from posts where ${where}`);
  return Number(row?.n);
}

async function slugs(): Promise<string[]> {
  const rows = await query<{ slug: string }>('select slug from posts order by slug');
  return rows.map((row) => row.slug);
}

let firstRun: SeedRun;

/** Fails with the seed's own output when the command did not succeed, before any SQL assertion runs. */
function expectSeeded(): void {
  expect(firstRun.exitCode, `db:seed failed.\nstdout: ${firstRun.stdout}\nstderr: ${firstRun.stderr}`).toBe(0);
}

beforeAll(async () => {
  await setupTestDatabase();
  await truncatePosts();
  firstRun = await runSeed();
}, 120_000);

afterAll(async () => {
  await closeTestDb();
});

describe('db:seed', () => {
  it('exits 0 and leaves 50 published past rows, 1 draft and 1 row scheduled ~30 days ahead (AC-48)', async () => {
    expectSeeded();

    expect(
      await count(`status = 'published' and published_at <= now() and published_at > now() - interval '365 days'`),
    ).toBe(50);
    expect(await count(`status = 'draft'`)).toBe(1);
    expect(
      await count(
        `status = 'published' and published_at between now() + interval '29 days' and now() + interval '31 days'`,
      ),
    ).toBe(1);
  });

  it('includes the edge-case rows the list page needs (AC-49)', async () => {
    expectSeeded();

    expect(await count('cover_image_url is null')).toBeGreaterThanOrEqual(3);
    expect(await count('char_length(title) >= 150')).toBeGreaterThanOrEqual(1);
    expect(await count(`title ~ '\\S{40,}'`)).toBeGreaterThanOrEqual(1);
    expect(await count('cardinality(tags) = 0')).toBeGreaterThanOrEqual(2);
    expect(await count('cardinality(tags) = 10')).toBeGreaterThanOrEqual(1);

    const shared = await query<{ n: string }>(
      `select count(*)::text as n from posts where status = 'published' group by published_at having count(*) >= 2`,
    );
    expect(shared.length).toBeGreaterThanOrEqual(1);
  });

  it('is idempotent: a second run keeps the same slugs and 52 rows (AC-50)', async () => {
    expectSeeded();
    const slugsAfterFirst = await slugs();
    expect(slugsAfterFirst).toHaveLength(52);

    const secondRun = await runSeed();

    expect(secondRun.exitCode, `second db:seed failed.\nstderr: ${secondRun.stderr}`).toBe(0);
    const slugsAfterSecond = await slugs();
    expect(slugsAfterSecond).toHaveLength(52);
    expect(slugsAfterSecond).toEqual(slugsAfterFirst);
  });

  describe('through GET /posts (AC-53)', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = await createTestApp();
    });

    afterAll(async () => {
      await app?.close();
    });

    it('reports 50 posts and never lists the draft or the scheduled post', async () => {
      expectSeeded();

      const response = await app.inject({ method: 'GET', url: '/posts?pageSize=50' });
      const body = response.json<{ items: Array<{ slug: string }>; totalItems: number }>();

      expect(response.statusCode).toBe(200);
      expect(body.totalItems).toBe(50);
      const listed = body.items.map((item) => item.slug);
      expect(listed).toHaveLength(50);
      expect(listed).not.toContain('seed-draft-post');
      expect(listed).not.toContain('seed-scheduled-post');
    });
  });
});

// ---- [T2] ---------------------------------------------------------------------------------------------------------

describe('db:seed refuses to run in production (AC-51)', () => {
  it('exits non-zero with a message naming production, and writes nothing', async () => {
    expectSeeded();
    // Make the seeded draft differ from what a seed run would write, so that a write would be visible.
    await query(`update posts set title = 'tampered before the production run' where slug = 'seed-draft-post'`);
    const before = await query('select * from posts order by slug');

    const run = await runSeed({ env: { NODE_ENV: 'production' } });

    expect(run.exitCode, `stdout: ${run.stdout}`).not.toBe(0);
    expect(run.stderr).toContain('production');
    expect(run.stdout).not.toContain('Seeded');
    expect(await query('select * from posts order by slug')).toEqual(before);
  }, 120_000);

  it('refuses before it connects: an unreachable database still gives the production message', async () => {
    const run = await runSeed({
      databaseUrl: 'postgres://blog:blog@127.0.0.1:1/blog',
      env: { NODE_ENV: 'production' },
    });

    expect(run.exitCode).not.toBe(0);
    expect(run.stderr).toContain('production');
    expect(run.stderr).not.toContain('ECONNREFUSED');
  }, 120_000);
});

describe('db:seed on a database without the posts table (AC-52)', () => {
  const unmigratedUrl = withDatabaseName(getTestDatabaseUrl(), 'blog_test_seed_unmigrated');

  beforeAll(async () => {
    await dropDatabase(unmigratedUrl);
    await ensureDatabase(unmigratedUrl);
  });

  afterAll(async () => {
    await dropDatabase(unmigratedUrl);
  });

  it('exits non-zero with a message naming db:migrate, and creates nothing', async () => {
    const run = await runSeed({ databaseUrl: unmigratedUrl });

    expect(run.exitCode, `stdout: ${run.stdout}`).not.toBe(0);
    expect(run.stderr).toContain('db:migrate');
    expect(run.stdout).not.toContain('Seeded');

    const client = new pg.Client({ connectionString: unmigratedUrl });
    await client.connect();
    try {
      const found = await client.query(`select to_regclass('public.posts') as present`);
      expect(found.rows[0]?.present).toBeNull();
    } finally {
      await client.end();
    }
  }, 120_000);
});

describe('db:seed leaves other rows alone (A-16)', () => {
  it('keeps a row that is not part of the seed unchanged, and adds the 52 seed rows beside it', async () => {
    expectSeeded();
    await insertPost({ slug: 'keep-me', title: 'Not a seed row', body: 'Hand-written body.' });
    const [before] = await query(`select * from posts where slug = 'keep-me'`);
    expect(before).toBeDefined();

    try {
      const run = await runSeed();

      expect(run.exitCode, `stderr: ${run.stderr}`).toBe(0);
      const [after] = await query(`select * from posts where slug = 'keep-me'`);
      expect(after).toEqual(before);
      expect(await count('true')).toBe(53);
    } finally {
      await query(`delete from posts where slug = 'keep-me'`);
    }
  }, 120_000);

  it('refreshes a seed row that was edited by hand: the seed owns its own slugs (upsert by slug)', async () => {
    expectSeeded();
    await query(`update posts set title = 'edited by hand' where slug = 'seed-draft-post'`);

    const run = await runSeed();

    expect(run.exitCode, `stderr: ${run.stderr}`).toBe(0);
    const [row] = await query<{ title: string }>(`select title from posts where slug = 'seed-draft-post'`);
    expect(row?.title).not.toBe('edited by hand');
    expect(await count('true')).toBe(52);
  }, 120_000);
});
