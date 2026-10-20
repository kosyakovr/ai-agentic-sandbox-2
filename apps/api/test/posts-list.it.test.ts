/**
 * GET /posts against a real Postgres (blog_test). Oracles: plan § Test brief WP4.tests [T1], spec AC-33..AC-36, AC-39, AC-42.
 */
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAppWithDatabaseUrl, createTestApp } from './helpers/app.js';
import {
  closeTestDb,
  dropDatabase,
  ensureDatabase,
  getTestDatabaseUrl,
  insertPost,
  setupTestDatabase,
  truncatePosts,
  withDatabaseName,
} from './helpers/db.js';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
const DAY_MS = 86_400_000;
const wordsOf = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

interface ListBody {
  items: Array<Record<string, unknown> & { slug: string }>;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

let app: FastifyInstance;

async function getList(url = '/posts') {
  const response = await app.inject({ method: 'GET', url });
  return { response, body: response.json<ListBody>() };
}

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

describe('GET /posts', () => {
  it('returns the first page of 12 with totals and a body that parses with PostsListResponse (AC-33)', async () => {
    for (let i = 0; i < 13; i++) {
      await insertPost({ slug: `post-${i}`, published_at: new Date(Date.now() - (i + 1) * DAY_MS) });
    }

    const { response, body } = await getList();

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    const { PostsListResponse } = await import('@blog/contracts/posts');
    expect(PostsListResponse.safeParse(body).success).toBe(true);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(12);
    expect(body.items).toHaveLength(12);
    expect(body.totalItems).toBe(13);
    expect(body.totalPages).toBe(2);
  });

  it('lists only published rows that are already visible, and counts only them (AC-34)', async () => {
    const past = ['past-1', 'past-2', 'past-3'];
    for (const [i, slug] of past.entries()) {
      await insertPost({ slug, published_at: new Date(Date.now() - (i + 1) * DAY_MS) });
    }
    await insertPost({ slug: 'a-draft', status: 'draft', published_at: null });
    // A draft that carries a past date must stay hidden too: only the status keeps it out.
    await insertPost({ slug: 'a-dated-draft', status: 'draft', published_at: new Date(Date.now() - DAY_MS) });
    await insertPost({ slug: 'a-scheduled', status: 'published', published_at: new Date(Date.now() + DAY_MS) });

    const { response, body } = await getList('/posts?pageSize=50');

    expect(response.statusCode).toBe(200);
    expect(body.items.map((item) => item.slug).sort()).toEqual([...past].sort());
    expect(body.totalItems).toBe(3);
  });

  it('orders by publishedAt desc then id desc, identically on repeated calls (AC-35)', async () => {
    const sameInstant = new Date(Date.now() - 2 * DAY_MS);
    // B's id sorts above A's; C is newer than both. A is inserted before B, so that an ORDER BY without the id
    // tie-break (which tends to return heap order) would list A before B.
    await insertPost({ slug: 'row-a', id: '01900000-0000-7000-8000-000000000001', published_at: sameInstant });
    await insertPost({ slug: 'row-b', id: '01900000-0000-7000-8000-000000000002', published_at: sameInstant });
    await insertPost({ slug: 'row-c', id: '01900000-0000-7000-8000-000000000003', published_at: new Date(Date.now() - DAY_MS) });

    const first = await getList();
    const second = await getList();

    expect(first.body.items.map((item) => item.slug)).toEqual(['row-c', 'row-b', 'row-a']);
    expect(second.body.items.map((item) => item.slug)).toEqual(['row-c', 'row-b', 'row-a']);
  });

  it('serves the 6th to 10th newest on page=2&pageSize=5 with totals (AC-36)', async () => {
    // post-00 is the newest, post-49 the oldest.
    for (let i = 0; i < 50; i++) {
      await insertPost({ slug: `post-${String(i).padStart(2, '0')}`, published_at: new Date(Date.now() - (i + 1) * 3_600_000) });
    }

    const { response, body } = await getList('/posts?page=2&pageSize=5');

    expect(response.statusCode).toBe(200);
    expect(body.items.map((item) => item.slug)).toEqual(['post-05', 'post-06', 'post-07', 'post-08', 'post-09']);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(5);
    expect(body.totalItems).toBe(50);
    expect(body.totalPages).toBe(10);
  });

  it('exposes exactly the nine PostSummary keys, nothing from the table beyond them (AC-39)', async () => {
    await insertPost({
      slug: 'full-row',
      title: 'A full row',
      excerpt: 'Short text',
      body: 'Body that must not leak into the list.',
      author_name: 'Ada',
      tags: ['one', 'two'],
      cover_image_url: '/covers/cover-1.webp',
      cover_image_alt: 'Abstract cover',
      status: 'published',
      published_at: new Date(Date.now() - DAY_MS),
    });

    const { body } = await getList();

    expect(Object.keys(body.items[0] ?? {}).sort()).toEqual([
      'authorName',
      'coverImage',
      'excerpt',
      'id',
      'publishedAt',
      'readingTimeMinutes',
      'slug',
      'tags',
      'title',
    ]);
  });

  it('answers 200 with Cache-Control: public, max-age=60 (AC-42)', async () => {
    await insertPost({ slug: 'cached-row' });

    const { response } = await getList();

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=60');
  });

  // ---- [T2] -------------------------------------------------------------------------------------------------

  it('answers 200 with an empty page and the real totals when the page is past the end (AC-37)', async () => {
    for (let i = 0; i < 50; i++) {
      await insertPost({ slug: `post-${String(i).padStart(2, '0')}`, published_at: new Date(Date.now() - (i + 1) * 3_600_000) });
    }

    const { response, body } = await getList('/posts?page=99');

    expect(response.statusCode).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.page).toBe(99);
    expect(body.totalItems).toBe(50);
    expect(body.totalPages).toBe(5);
  });

  it('answers 200 with no items and totalPages 0 when nothing is listed (contract)', async () => {
    await insertPost({ slug: 'a-draft', status: 'draft', published_at: null });

    const { response, body } = await getList();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 });
  });

  it('computes totalPages as ceil(totalItems / pageSize) and serves a partial last page (AC-36)', async () => {
    for (let i = 0; i < 13; i++) {
      await insertPost({ slug: `post-${String(i).padStart(2, '0')}`, published_at: new Date(Date.now() - (i + 1) * 3_600_000) });
    }

    const { body } = await getList('/posts?page=3&pageSize=5');

    expect(body.items.map((item) => item.slug)).toEqual(['post-10', 'post-11', 'post-12']);
    expect(body.totalItems).toBe(13);
    expect(body.totalPages).toBe(3);
  });

  it('returns coverImage null for a row without a cover and { url, alt } for a row with one (AC-41)', async () => {
    await insertPost({
      slug: 'with-cover',
      cover_image_url: '/covers/cover-2.webp',
      cover_image_alt: 'Abstract waves',
      published_at: new Date(Date.now() - DAY_MS),
    });
    await insertPost({ slug: 'no-cover', published_at: new Date(Date.now() - 2 * DAY_MS) });

    const { body } = await getList();
    const bySlug = new Map(body.items.map((item) => [item.slug, item]));

    expect(bySlug.get('with-cover')?.coverImage).toEqual({ url: '/covers/cover-2.webp', alt: 'Abstract waves' });
    expect(bySlug.get('no-cover')?.coverImage).toBeNull();
  });

  it('keeps a decorative cover: an empty alt is returned as an empty string, not as no cover (A-4)', async () => {
    await insertPost({ slug: 'decorative', cover_image_url: '/covers/cover-3.webp', cover_image_alt: '' });

    const { body } = await getList();

    expect(body.items[0]?.coverImage).toEqual({ url: '/covers/cover-3.webp', alt: '' });
  });

  it('returns publishedAt as the stored instant in UTC ISO form, to the millisecond', async () => {
    // A past instant, so that the row is visible whatever the database clock says.
    await insertPost({ slug: 'precise', published_at: '2024-10-20T08:00:00.123Z' });

    const { body } = await getList();

    expect(body.items[0]?.publishedAt).toBe('2024-10-20T08:00:00.123Z');
  });

  it('breaks ties by id desc by itself, not only because the index happens to hold that order (AC-35, A-21)', async () => {
    // Without the index the planner has to sort, and only the ORDER BY clause decides the order of equal instants.
    // Needs a migrated database without posts_published_list_idx: a throwaway one, created and dropped here.
    const url = withDatabaseName(getTestDatabaseUrl(), 'blog_test_tiebreak');
    await dropDatabase(url);
    await ensureDatabase(url);
    const client = new pg.Client({ connectionString: url });
    let tieApp: FastifyInstance | undefined;
    try {
      await client.connect();
      await migrate(drizzle({ client, casing: 'snake_case' }), { migrationsFolder });
      await client.query('drop index posts_published_list_idx');
      const sameInstant = new Date(Date.now() - DAY_MS);
      const ids = Array.from({ length: 24 }, (_, i) => `01900000-0000-7000-8000-${String((i * 7) % 24).padStart(12, '0')}`);
      for (const [i, id] of ids.entries()) {
        await client.query(
          `insert into posts (id, slug, title, excerpt, body, author_name, tags, status, published_at)
           values ($1, $2, 't', 'e', 'b', 'a', '{}', 'published', $3)`,
          [id, `tie-${i}`, sameInstant],
        );
      }
      tieApp = await createAppWithDatabaseUrl(url);

      const response = await tieApp.inject({ method: 'GET', url: '/posts?pageSize=50' });
      const listedIds = response.json<ListBody>().items.map((item) => item['id'] as string);

      expect(listedIds).toEqual([...ids].sort().reverse());
    } finally {
      await tieApp?.close();
      await client.end().catch(() => undefined);
      await dropDatabase(url);
    }
  }, 30_000);

  it('returns the tags in stored order (A-15)', async () => {
    await insertPost({ slug: 'tagged', tags: ['zeta', 'alpha', 'mid'] });

    const { body } = await getList();

    expect(body.items[0]?.tags).toEqual(['zeta', 'alpha', 'mid']);
  });

  it('derives readingTimeMinutes from the stored body: 200 words -> 1, 201 words -> 2 (AC-40)', async () => {
    await insertPost({ slug: 'short-read', body: wordsOf(200), published_at: new Date(Date.now() - DAY_MS) });
    await insertPost({ slug: 'long-read', body: wordsOf(201), published_at: new Date(Date.now() - 2 * DAY_MS) });

    const { body } = await getList();
    const minutes = Object.fromEntries(body.items.map((item) => [item.slug, item.readingTimeMinutes]));

    expect(minutes).toEqual({ 'short-read': 1, 'long-read': 2 });
  });
});
