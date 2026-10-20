/**
 * Constraints of the `posts` table, against the real Postgres test database (blog_test; files run serially).
 * Oracles: plan § Test brief WP2.tests [T2], plan § Contract (DB shape), spec AC-45, AC-46, AC-47, A-4.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  closeTestDb,
  insertPost,
  query,
  setupTestDatabase,
  truncatePosts,
  type TestPostRow,
} from './helpers/db.js';

const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';
const PAST = new Date(Date.now() - 86_400_000);

/** Resolves to the SQLSTATE of the failure, or `undefined` when the insert succeeded. */
async function sqlState(row: TestPostRow): Promise<string | undefined> {
  try {
    await insertPost(row);
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await truncatePosts();
});

describe('posts table constraints', () => {
  it('rejects a second row with an existing slug with a unique violation (AC-45)', async () => {
    await insertPost({ slug: 'dup' });

    expect(await sqlState({ slug: 'dup' })).toBe(UNIQUE_VIOLATION);
    const [row] = await query<{ n: string }>('select count(*)::text as n from posts');
    expect(row?.n).toBe('1');
  });

  it('rejects a published row without published_at with a check violation (AC-46)', async () => {
    expect(await sqlState({ slug: 'no-date', status: 'published', published_at: null })).toBe(CHECK_VIOLATION);
  });

  it('accepts a published row with published_at', async () => {
    expect(await sqlState({ slug: 'dated', status: 'published', published_at: PAST })).toBeUndefined();
  });

  it('rejects a cover url without alt with a check violation (AC-47)', async () => {
    expect(await sqlState({ slug: 'url-only', cover_image_url: '/covers/cover-1.webp', cover_image_alt: null })).toBe(
      CHECK_VIOLATION,
    );
  });

  it('rejects a cover alt without url with a check violation (AC-47)', async () => {
    expect(await sqlState({ slug: 'alt-only', cover_image_url: null, cover_image_alt: 'Some alt' })).toBe(CHECK_VIOLATION);
  });

  it('accepts a cover with both url and an empty (decorative) alt, and a row with neither', async () => {
    expect(await sqlState({ slug: 'decorative', cover_image_url: '/covers/cover-1.webp', cover_image_alt: '' })).toBeUndefined();
    expect(await sqlState({ slug: 'no-cover' })).toBeUndefined();
  });

  it('accepts a draft without published_at and assigns a version-7 uuid', async () => {
    const { id } = await insertPost({ slug: 'a-draft', status: 'draft', published_at: null });

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const [row] = await query<{ status: string; published_at: Date | null }>('select status, published_at from posts where id = $1', [id]);
    expect(row).toEqual({ status: 'draft', published_at: null });
  });

  it('defaults status to draft and tags to an empty array, and stamps created_at and updated_at', async () => {
    await query(`insert into posts (slug, title, excerpt, body, author_name) values ('defaults', 't', 'e', 'b', 'a')`);

    const [row] = await query<{ status: string; tags: string[]; created_at: Date; updated_at: Date }>(
      `select status, tags, created_at, updated_at from posts where slug = 'defaults'`,
    );
    expect(row?.status).toBe('draft');
    expect(row?.tags).toEqual([]);
    expect(row?.created_at).toBeInstanceOf(Date);
    expect(row?.updated_at).toBeInstanceOf(Date);
  });

  describe('field bounds from the DB shape (A-4)', () => {
    it.each<[string, TestPostRow]>([
      ['a slug with uppercase letters', { slug: 'Bad-Slug' }],
      ['a slug with a space', { slug: 'bad slug' }],
      ['a slug with a trailing dash', { slug: 'bad-' }],
      ['a slug of 101 characters', { slug: 'a'.repeat(101) }],
      ['an empty title', { slug: 'empty-title', title: '' }],
      ['a title of 201 characters', { slug: 'long-title', title: 'a'.repeat(201) }],
      ['an empty excerpt', { slug: 'empty-excerpt', excerpt: '' }],
      ['an excerpt of 301 characters', { slug: 'long-excerpt', excerpt: 'a'.repeat(301) }],
      ['an empty author name', { slug: 'empty-author', author_name: '' }],
      ['an author name of 101 characters', { slug: 'long-author', author_name: 'a'.repeat(101) }],
      ['11 tags', { slug: 'eleven-tags', tags: Array.from({ length: 11 }, (_, i) => `tag${i}`) }],
      ['a cover alt of 201 characters', { slug: 'long-alt', cover_image_url: '/a.webp', cover_image_alt: 'a'.repeat(201) }],
      ['a status other than draft or published', { slug: 'archived', status: 'archived' as 'draft', published_at: PAST }],
    ])('rejects %s with a check violation', async (_label, row) => {
      expect(await sqlState(row)).toBe(CHECK_VIOLATION);
    });

    it('accepts the limits: title 200, excerpt 300, author 100, slug 100, 10 tags, alt 200', async () => {
      const state = await sqlState({
        slug: 'a'.repeat(100),
        title: 'a'.repeat(200),
        excerpt: 'a'.repeat(300),
        author_name: 'a'.repeat(100),
        tags: Array.from({ length: 10 }, (_, i) => `tag${i}`),
        cover_image_url: '/a.webp',
        cover_image_alt: 'a'.repeat(200),
      });
      expect(state).toBeUndefined();
    });
  });
});
