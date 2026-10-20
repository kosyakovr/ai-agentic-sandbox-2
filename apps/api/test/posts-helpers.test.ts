/**
 * posts module helpers: reading time and the row -> wire mapping. Unit test: no database.
 * Oracles: spec AC-40, AC-41, AC-39, A-5, A-15; plan § Test brief WP4.tests [T2], WP4 step 3.
 * The PublishedPost input shape is the module's domain type (seam).
 */
import { PostSummary } from '@blog/contracts/posts';
import { describe, expect, it } from 'vitest';
import { readingTimeMinutes, toPostsListResponse, toPostSummary } from '../src/modules/posts/helpers.js';

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('readingTimeMinutes (AC-40)', () => {
  it.each([
    ['an empty body takes 1 min', '', 1],
    ['one word takes 1 min', 'word', 1],
    ['200 words take 1 min', words(200), 1],
    ['201 words take 2 min', words(201), 2],
    ['400 words take 2 min', words(400), 2],
    ['401 words take 3 min', words(401), 3],
    ['surrounding whitespace, a newline and a tab count 2 words: 1 min', '  a\n\tb  ', 1],
    ['exactly 200 words wrapped in whitespace take 1 min (no empty 201st word)', ` \n${words(200)}\t `, 1],
  ])('%s', (_label, body, expected) => {
    expect(readingTimeMinutes(body)).toBe(expected);
  });

  it('counts words separated by newlines and tabs, not only by spaces', () => {
    const body = Array.from({ length: 201 }, (_, i) => `w${i}`).join('\n\t');
    expect(readingTimeMinutes(body)).toBe(2);
  });
});

const post = {
  id: '01900000-0000-7000-8000-000000000001',
  slug: 'hello-world',
  title: 'Hello',
  excerpt: 'An excerpt.',
  authorName: 'Ada',
  tags: ['b', 'a', 'c'],
  body: words(201),
  publishedAt: new Date('2026-10-20T08:00:00.123Z'),
  coverImageUrl: '/covers/cover-1.webp' as string | null,
  coverImageAlt: 'Abstract' as string | null,
};

describe('toPostSummary', () => {
  it('maps a row to exactly the nine PostSummary fields and never leaks the body (AC-39)', () => {
    const summary = toPostSummary(post);

    expect(Object.keys(summary).sort()).toEqual([
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
    expect(PostSummary.safeParse(summary).success).toBe(true);
  });

  it('formats publishedAt as the UTC ISO string with milliseconds and Z', () => {
    expect(toPostSummary(post).publishedAt).toBe('2026-10-20T08:00:00.123Z');
  });

  it('derives the reading time from the body', () => {
    expect(toPostSummary(post).readingTimeMinutes).toBe(2);
    expect(toPostSummary({ ...post, body: 'short' }).readingTimeMinutes).toBe(1);
  });

  it('keeps the tags in stored order (A-15)', () => {
    expect(toPostSummary(post).tags).toEqual(['b', 'a', 'c']);
  });

  it('returns the cover as { url, alt } when both are stored', () => {
    expect(toPostSummary(post).coverImage).toEqual({ url: '/covers/cover-1.webp', alt: 'Abstract' });
  });

  it('keeps an empty alt: a decorative cover is still a cover (A-4)', () => {
    expect(toPostSummary({ ...post, coverImageAlt: '' }).coverImage).toEqual({ url: '/covers/cover-1.webp', alt: '' });
  });

  it('returns coverImage null when there is no cover (AC-41)', () => {
    expect(toPostSummary({ ...post, coverImageUrl: null, coverImageAlt: null }).coverImage).toBeNull();
  });

  it('returns coverImage null unless both url and alt are set (WP4 step 3)', () => {
    expect(toPostSummary({ ...post, coverImageAlt: null }).coverImage).toBeNull();
    expect(toPostSummary({ ...post, coverImageUrl: null }).coverImage).toBeNull();
  });
});

describe('toPostsListResponse', () => {
  const posts = [post, { ...post, id: '01900000-0000-7000-8000-000000000002', slug: 'second' }];

  it('echoes page and pageSize and maps every post', () => {
    const response = toPostsListResponse(posts, 13, 2, 5);
    expect(response.page).toBe(2);
    expect(response.pageSize).toBe(5);
    expect(response.totalItems).toBe(13);
    expect(response.items.map((item) => item.slug)).toEqual(['hello-world', 'second']);
  });

  it.each([
    [0, 12, 0],
    [1, 12, 1],
    [12, 12, 1],
    [13, 12, 2],
    [50, 5, 10],
    [50, 12, 5],
    [51, 50, 2],
  ])('totalItems %i with pageSize %i -> totalPages %i', (total, pageSize, expected) => {
    expect(toPostsListResponse([], total, 1, pageSize).totalPages).toBe(expected);
  });
});
