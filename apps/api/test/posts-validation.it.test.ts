/**
 * GET /posts query validation, against the real Postgres test database (blog_test; files run serially).
 * Oracles: plan § Test brief WP4.tests [T2], plan Contract (query, errors), spec AC-38, AC-43, A-2.
 */
import { ProblemDetails } from '@blog/contracts/errors';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/app.js';
import {
  closeTestDb,
  insertPost,
  setupTestDatabase,
  truncatePosts,
} from './helpers/db.js';

let app: FastifyInstance;

beforeAll(async () => {
  await setupTestDatabase();
  app = await createTestApp();
});

afterAll(async () => {
  await app?.close();
  await closeTestDb();
});

beforeEach(async () => {
  await truncatePosts();
});

describe('invalid query (AC-38)', () => {
  it.each([
    ['page=0', 'page'],
    ['page=10001', 'page'],
    ['page=a', 'page'],
    ['page=1.5', 'page'],
    ['page=1e3', 'page'],
    ['page=-1', 'page'],
    ['page=', 'page'],
    ['page=1&page=2', 'page'],
    ['pageSize=0', 'pageSize'],
    ['pageSize=51', 'pageSize'],
    ['pageSize=x', 'pageSize'],
    ['pageSize=10&pageSize=20', 'pageSize'],
  ])('GET /posts?%s -> 400 problem naming "%s"', async (queryString, param) => {
    const response = await app.inject({ method: 'GET', url: `/posts?${queryString}` });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    const body = response.json<ProblemDetails>();
    expect(ProblemDetails.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({ type: 'about:blank', title: 'Bad request', status: 400 });
    expect(body.errors?.[0]?.param).toBe(param);
    for (const error of body.errors ?? []) expect(error.message.length).toBeGreaterThan(0);
  });

  it('names both parameters when both are invalid', async () => {
    const response = await app.inject({ method: 'GET', url: '/posts?page=0&pageSize=51' });

    expect(response.statusCode).toBe(400);
    const params = (response.json<ProblemDetails>().errors ?? []).map((error) => error.param);
    expect([...new Set(params)].sort()).toEqual(['page', 'pageSize']);
  });

  it('answers a 400 with Cache-Control: no-store (AC-43)', async () => {
    const response = await app.inject({ method: 'GET', url: '/posts?page=0' });

    expect(response.statusCode).toBe(400);
    expect(response.headers['cache-control']).toBe('no-store');
  });

});

describe('valid query', () => {
  it('accepts digits with leading zeros: page=01 is page 1', async () => {
    await insertPost({ slug: 'only-post' });

    const response = await app.inject({ method: 'GET', url: '/posts?page=01' });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ page: number }>().page).toBe(1);
  });

  it('accepts the range limits: page=10000 and pageSize=50 (200, an empty page past the end)', async () => {
    await insertPost({ slug: 'only-post' });

    const response = await app.inject({ method: 'GET', url: '/posts?page=10000&pageSize=50' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ items: [], page: 10000, pageSize: 50, totalItems: 1, totalPages: 1 });
  });

  it('accepts pageSize=1', async () => {
    await insertPost({ slug: 'first-post', published_at: new Date(Date.now() - 2 * 86_400_000) });
    await insertPost({ slug: 'second-post', published_at: new Date(Date.now() - 3 * 86_400_000) });

    const response = await app.inject({ method: 'GET', url: '/posts?pageSize=1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ pageSize: 1, totalItems: 2, totalPages: 2 });
    expect(response.json<{ items: unknown[] }>().items).toHaveLength(1);
  });

  it('ignores other query parameters: ?foo=bar gives the same body as no query', async () => {
    for (let i = 0; i < 3; i++) {
      await insertPost({ slug: `post-${i}`, published_at: new Date(Date.now() - (i + 1) * 86_400_000) });
    }

    const plain = await app.inject({ method: 'GET', url: '/posts' });
    const withExtra = await app.inject({ method: 'GET', url: '/posts?foo=bar&utm_source=x' });

    expect(withExtra.statusCode).toBe(200);
    expect(withExtra.json()).toEqual(plain.json());
  });
});
