/**
 * GET /posts when the database cannot answer: 503 problem with no internals.
 * Oracles: plan § Test brief WP4.tests [T2], spec AC-44, AC-43 ("or the query fails").
 */
import { ProblemDetails } from '@blog/contracts/errors';
import { afterAll, describe, expect, it } from 'vitest';
import { createAppWithDatabaseUrl } from './helpers/app.js';
import { closeTestDb, dropDatabase, ensureDatabase, getTestDatabaseUrl, withDatabaseName } from './helpers/db.js';

const FORBIDDEN = ['select', 'posts', 'ECONNREFUSED', '127.0.0.1', '    at ', 'relation', 'does not exist', 'password'];

function expectNoInternals(rawBody: string): void {
  const lower = rawBody.toLowerCase();
  for (const text of FORBIDDEN) expect(lower, `the body must not contain "${text}"`).not.toContain(text.toLowerCase());
}

afterAll(async () => {
  await closeTestDb();
});

describe('GET /posts without a working database (AC-44)', () => {
  it('answers 503 within 5 s when the database is unreachable, and leaks nothing', async () => {
    const app = await createAppWithDatabaseUrl('postgres://blog:blog@127.0.0.1:1/blog');
    try {
      const startedAt = Date.now();
      const response = await app.inject({ method: 'GET', url: '/posts' });

      expect(Date.now() - startedAt).toBeLessThan(5000);
      expect(response.statusCode).toBe(503);
      expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(response.headers['cache-control']).toBe('no-store');
      const body = response.json<ProblemDetails>();
      expect(ProblemDetails.safeParse(body).success).toBe(true);
      expect(body).toMatchObject({ type: 'about:blank', title: 'Service unavailable', status: 503 });
      expectNoInternals(response.body);
    } finally {
      await app.close();
    }
  }, 15_000);

  it('answers 503 when the database is reachable but the query fails (posts table missing), and leaks nothing', async () => {
    const url = withDatabaseName(getTestDatabaseUrl(), 'blog_test_unavailable_empty');
    await dropDatabase(url);
    await ensureDatabase(url);
    const app = await createAppWithDatabaseUrl(url);
    try {
      const response = await app.inject({ method: 'GET', url: '/posts' });

      expect(response.statusCode).toBe(503);
      expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.json<ProblemDetails>().title).toBe('Service unavailable');
      expectNoInternals(response.body);
    } finally {
      await app.close();
      await dropDatabase(url);
    }
  }, 30_000);
});
