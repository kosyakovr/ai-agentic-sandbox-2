/**
 * Shared Zod contracts (@blog/contracts). Unit test: no database, no app.
 * Oracles: plan § Test brief WP1.tests [T2], plan § Contract, spec A-2, A-4, AC-38, AC-39.
 */
import { ProblemDetails } from '@blog/contracts/errors';
import { PostsListQuery, PostsListResponse, PostSummary } from '@blog/contracts/posts';
import { describe, expect, it } from 'vitest';

function failedPaths(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[] }> } }): PropertyKey[][] {
  expect(result.success, 'the parse should have failed').toBe(false);
  return result.error?.issues.map((issue) => issue.path) ?? [];
}

describe('PostsListQuery', () => {
  it('defaults to page 1 and pageSize 12', () => {
    expect(PostsListQuery.parse({})).toEqual({ page: 1, pageSize: 12 });
  });

  it('turns digit strings into numbers, leading zeros included', () => {
    expect(PostsListQuery.parse({ page: '01' })).toEqual({ page: 1, pageSize: 12 });
    expect(PostsListQuery.parse({ page: '3', pageSize: '5' })).toEqual({ page: 3, pageSize: 5 });
  });

  it('accepts the range limits 1 and 10000 for page, 1 and 50 for pageSize', () => {
    expect(PostsListQuery.parse({ page: '10000', pageSize: '50' })).toEqual({ page: 10000, pageSize: 50 });
    expect(PostsListQuery.parse({ page: '1', pageSize: '1' })).toEqual({ page: 1, pageSize: 1 });
  });

  it.each([
    ['1e3', 'exponent notation'],
    ['1.5', 'a decimal'],
    ['-1', 'a negative number'],
    ['+1', 'a sign'],
    ['', 'an empty string'],
    ['abc', 'letters'],
    ['0', 'below the minimum'],
    ['10001', 'above the maximum'],
  ])('rejects page=%j (%s) with an issue on "page"', (value) => {
    expect(failedPaths(PostsListQuery.safeParse({ page: value }))).toEqual([['page']]);
  });

  it('rejects a repeated page key, which arrives as an array', () => {
    expect(failedPaths(PostsListQuery.safeParse({ page: ['1', '2'] }))).toEqual([['page']]);
  });

  it.each(['51', '0', '1.5', 'x'])('rejects pageSize=%j with an issue on "pageSize"', (value) => {
    expect(failedPaths(PostsListQuery.safeParse({ pageSize: value }))).toEqual([['pageSize']]);
  });

  it('reports both parameters when both are invalid', () => {
    const paths = failedPaths(PostsListQuery.safeParse({ page: '0', pageSize: '51' })).map((path) => path[0]);
    expect(paths.sort()).toEqual(['page', 'pageSize']);
  });

  it('strips unknown keys', () => {
    const parsed = PostsListQuery.parse({ foo: 'x' });
    expect(parsed).toEqual({ page: 1, pageSize: 12 });
    expect('foo' in parsed).toBe(false);
  });
});

describe('PostSummary', () => {
  const valid = {
    id: '01900000-0000-7000-8000-000000000001',
    slug: 'hello-world',
    title: 'Hello',
    excerpt: 'A short excerpt.',
    authorName: 'Ada',
    tags: ['web', 'api'],
    publishedAt: '2026-10-20T10:00:00.000Z',
    readingTimeMinutes: 1,
    coverImage: { url: '/covers/cover-1.webp', alt: 'Abstract cover' },
  };
  const parse = (overrides: Record<string, unknown>) => PostSummary.safeParse({ ...valid, ...overrides });

  it('accepts a valid summary, with and without a cover', () => {
    expect(PostSummary.safeParse(valid).success).toBe(true);
    expect(parse({ coverImage: null }).success).toBe(true);
  });

  it('strips fields that are not part of the summary, such as body and status', () => {
    const parsed = PostSummary.parse({ ...valid, body: 'secret body', status: 'published' });
    expect(Object.keys(parsed).sort()).toEqual(Object.keys(valid).sort());
  });

  it.each(['https://x.test/a.webp', '//x/a.webp', 'covers/a.webp', 'javascript:alert(1)', '/has space.webp'])(
    'rejects the cover url %j (root-relative paths only)',
    (url) => {
      expect(parse({ coverImage: { url, alt: 'x' } }).success).toBe(false);
    },
  );

  it('accepts a root-relative cover url and an empty (decorative) alt', () => {
    expect(parse({ coverImage: { url: '/covers/cover-1.webp', alt: '' } }).success).toBe(true);
  });

  it('rejects a cover alt of 201 characters and accepts 200', () => {
    expect(parse({ coverImage: { url: '/a.webp', alt: 'a'.repeat(200) } }).success).toBe(true);
    expect(parse({ coverImage: { url: '/a.webp', alt: 'a'.repeat(201) } }).success).toBe(false);
  });

  it.each(['Bad Slug', 'UPPER', 'trailing-', '-leading', 'double--dash', 'under_score', ''])(
    'rejects the slug %j',
    (slug) => {
      expect(parse({ slug }).success).toBe(false);
    },
  );

  it('accepts a slug of 100 characters and rejects 101', () => {
    expect(parse({ slug: 'a'.repeat(100) }).success).toBe(true);
    expect(parse({ slug: 'a'.repeat(101) }).success).toBe(false);
  });

  it('accepts a UTC publishedAt and rejects an offset or a non-date', () => {
    expect(parse({ publishedAt: '2026-10-20T10:00:00.123Z' }).success).toBe(true);
    expect(parse({ publishedAt: '2026-10-20T10:00:00+02:00' }).success).toBe(false);
    expect(parse({ publishedAt: '2026-10-20' }).success).toBe(false);
    expect(parse({ publishedAt: 'yesterday' }).success).toBe(false);
  });

  it('rejects a reading time below 1 or a fraction', () => {
    expect(parse({ readingTimeMinutes: 0 }).success).toBe(false);
    expect(parse({ readingTimeMinutes: 1.5 }).success).toBe(false);
    expect(parse({ readingTimeMinutes: 2 }).success).toBe(true);
  });

  it('rejects an id that is not a uuid', () => {
    expect(parse({ id: '123' }).success).toBe(false);
  });

  it('enforces the A-4 text bounds: title 1-200, excerpt 1-300, author 1-100', () => {
    expect(parse({ title: 'a'.repeat(200) }).success).toBe(true);
    expect(parse({ title: 'a'.repeat(201) }).success).toBe(false);
    expect(parse({ title: '' }).success).toBe(false);
    expect(parse({ excerpt: 'a'.repeat(300) }).success).toBe(true);
    expect(parse({ excerpt: 'a'.repeat(301) }).success).toBe(false);
    expect(parse({ excerpt: '' }).success).toBe(false);
    expect(parse({ authorName: 'a'.repeat(100) }).success).toBe(true);
    expect(parse({ authorName: 'a'.repeat(101) }).success).toBe(false);
    expect(parse({ authorName: '' }).success).toBe(false);
  });

  it('enforces the A-4 tag bounds: at most 10 tags of 1-32 lowercase characters', () => {
    expect(parse({ tags: [] }).success).toBe(true);
    expect(parse({ tags: Array.from({ length: 10 }, (_, i) => `tag${i}`) }).success).toBe(true);
    expect(parse({ tags: Array.from({ length: 11 }, (_, i) => `tag${i}`) }).success).toBe(false);
    expect(parse({ tags: ['a'.repeat(32)] }).success).toBe(true);
    expect(parse({ tags: ['a'.repeat(33)] }).success).toBe(false);
    expect(parse({ tags: [''] }).success).toBe(false);
    expect(parse({ tags: ['Web'] }).success).toBe(false);
  });

  it.each(['hello world', '<b>x</b>', 'c++', 'under_score', '-lead', 'trail-', 'a--b'])(
    'rejects the tag %j (R-4: ^[a-z0-9]+(-[a-z0-9]+)*$)',
    (tag) => {
      expect(parse({ tags: [tag] }).success).toBe(false);
    },
  );

  it.each([['ok-tag'], ['a1'], ['a'.repeat(32)], ['a-'.repeat(15) + 'bb']])('accepts the tag %j (R-4)', (tag) => {
    expect(tag.length).toBeLessThanOrEqual(32);
    expect(parse({ tags: [tag] }).success).toBe(true);
  });
});

describe('PostsListResponse', () => {
  it('accepts an empty list with totalPages 0', () => {
    expect(PostsListResponse.safeParse({ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 }).success).toBe(true);
  });

  it.each(['items', 'page', 'pageSize', 'totalItems', 'totalPages'])('rejects a body without "%s"', (key) => {
    const body: Record<string, unknown> = { items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 };
    delete body[key];
    expect(PostsListResponse.safeParse(body).success).toBe(false);
  });
});

describe('ProblemDetails', () => {
  const base = { type: 'about:blank', title: 'Not found', status: 404, detail: 'Nothing here.' };

  it('accepts a problem without errors', () => {
    expect(ProblemDetails.safeParse(base).success).toBe(true);
  });

  it('accepts a problem with errors[] of param and message', () => {
    const parsed = ProblemDetails.safeParse({ ...base, status: 400, errors: [{ param: 'page', message: 'Invalid' }] });
    expect(parsed.success).toBe(true);
  });

  it('rejects an error entry without a param', () => {
    expect(ProblemDetails.safeParse({ ...base, errors: [{ message: 'Invalid' }] }).success).toBe(false);
  });

  it('rejects a type other than about:blank and a missing status', () => {
    expect(ProblemDetails.safeParse({ ...base, type: 'https://example.test/x' }).success).toBe(false);
    const { status: _status, ...withoutStatus } = base;
    expect(ProblemDetails.safeParse(withoutStatus).success).toBe(false);
  });
});
