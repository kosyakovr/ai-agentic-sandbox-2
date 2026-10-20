/**
 * The pure seed generator. Unit test: no database.
 * Oracles: plan § Test brief WP5.tests [T2], plan WP5 step 1, spec AC-48, AC-49, A-4, A-16.
 */
import { PostSummary } from '@blog/contracts/posts';
import { describe, expect, it } from 'vitest';
import { generateSeedPosts } from '../src/db/seed/generate.js';

const NOW = new Date('2026-10-20T12:00:00Z');
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const rows = generateSeedPosts(NOW);
const published = rows.filter((row) => row.status === 'published' && row.publishedAt !== null && row.publishedAt <= NOW);
const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

describe('generateSeedPosts', () => {
  it('is deterministic: two calls with the same instant are deep-equal', () => {
    expect(generateSeedPosts(NOW)).toEqual(generateSeedPosts(new Date(NOW)));
  });

  it('keeps the content when only the clock moves, and moves every date by the same amount (A-16)', () => {
    const later = new Date(NOW.getTime() + 10 * DAY_MS);
    const other = generateSeedPosts(later);

    expect(other).toHaveLength(rows.length);
    other.forEach((row, index) => {
      const base = rows[index]!;
      expect({ ...row, publishedAt: null }).toEqual({ ...base, publishedAt: null });
      if (base.publishedAt === null) expect(row.publishedAt).toBeNull();
      else expect(row.publishedAt!.getTime() - base.publishedAt.getTime()).toBe(10 * DAY_MS);
    });
  });

  it('returns 52 rows with unique kebab-case slugs of at most 100 characters', () => {
    expect(rows).toHaveLength(52);
    const slugs = rows.map((row) => row.slug);
    expect(new Set(slugs).size).toBe(52);
    for (const slug of slugs) {
      expect(slug).toMatch(SLUG);
      expect(slug.length).toBeLessThanOrEqual(100);
    }
  });

  it('holds 50 published rows dated between 364 days and 1 hour before now (AC-48)', () => {
    expect(published).toHaveLength(50);
    for (const row of published) {
      const age = NOW.getTime() - row.publishedAt!.getTime();
      expect(age).toBeGreaterThanOrEqual(HOUR_MS);
      expect(age).toBeLessThanOrEqual(364 * DAY_MS);
    }
  });

  it('holds one draft with no publishedAt, slug seed-draft-post (AC-48)', () => {
    const drafts = rows.filter((row) => row.status === 'draft');
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.slug).toBe('seed-draft-post');
    expect(drafts[0]!.publishedAt).toBeNull();
  });

  it('holds one published row scheduled about 30 days ahead, slug seed-scheduled-post (AC-48)', () => {
    const scheduled = rows.filter((row) => row.status === 'published' && row.publishedAt !== null && row.publishedAt > NOW);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]!.slug).toBe('seed-scheduled-post');
    const ahead = scheduled[0]!.publishedAt!.getTime() - NOW.getTime();
    expect(ahead).toBeGreaterThanOrEqual(29 * DAY_MS);
    expect(ahead).toBeLessThanOrEqual(31 * DAY_MS);
  });

  describe('the edge rows (AC-49)', () => {
    it('has at least 3 published rows without a cover', () => {
      expect(published.filter((row) => row.coverImageUrl === null).length).toBeGreaterThanOrEqual(3);
    });

    it('has a title of at least 150 characters, and none above the 200 limit', () => {
      expect(published.some((row) => row.title.length >= 150)).toBe(true);
      for (const row of rows) expect(row.title.length).toBeLessThanOrEqual(200);
    });

    it('has a title with an unbroken word of 40 or more characters', () => {
      expect(published.some((row) => /\S{40,}/.test(row.title))).toBe(true);
    });

    it('has a title with literal markup: <b>HTML</b>', () => {
      expect(published.some((row) => row.title.includes('<b>HTML</b>'))).toBe(true);
    });

    it('has at least 2 rows without tags and one with exactly 10', () => {
      expect(published.filter((row) => row.tags.length === 0).length).toBeGreaterThanOrEqual(2);
      expect(published.some((row) => row.tags.length === 10)).toBe(true);
    });

    it('has two published rows sharing one publishedAt instant', () => {
      const counts = new Map<number, number>();
      for (const row of published) counts.set(row.publishedAt!.getTime(), (counts.get(row.publishedAt!.getTime()) ?? 0) + 1);
      expect(Math.max(...counts.values())).toBeGreaterThanOrEqual(2);
    });
  });

  describe('every row respects the A-4 bounds and the table constraints', () => {
    it('keeps text lengths, tag shape and cover pairing within bounds', () => {
      for (const row of rows) {
        expect(row.title.length).toBeGreaterThanOrEqual(1);
        expect(row.excerpt.length).toBeGreaterThanOrEqual(1);
        expect(row.excerpt.length).toBeLessThanOrEqual(300);
        expect(row.authorName.length).toBeGreaterThanOrEqual(1);
        expect(row.authorName.length).toBeLessThanOrEqual(100);
        expect(row.tags.length).toBeLessThanOrEqual(10);
        for (const tag of row.tags) expect(tag).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        for (const tag of row.tags) expect(tag.length).toBeLessThanOrEqual(32);
        expect(row.coverImageUrl === null).toBe(row.coverImageAlt === null);
        if (row.coverImageAlt !== null) expect(row.coverImageAlt.length).toBeLessThanOrEqual(200);
      }
    });

    it('uses only the four generated covers /covers/cover-{1..4}.webp, each with alt text', () => {
      const covered = rows.filter((row) => row.coverImageUrl !== null);
      expect(covered.length).toBeGreaterThan(0);
      for (const row of covered) {
        expect(row.coverImageUrl).toMatch(/^\/covers\/cover-[1-4]\.webp$/);
        expect(row.coverImageAlt!.length).toBeGreaterThan(0);
      }
    });

    it('has a published row only with a publishedAt, and a draft without one', () => {
      for (const row of rows) {
        if (row.status === 'published') expect(row.publishedAt).not.toBeNull();
        else expect(row.publishedAt).toBeNull();
      }
    });

    it('has bodies of 50 to 2400 words', () => {
      for (const row of rows) {
        expect(wordCount(row.body)).toBeGreaterThanOrEqual(50);
        expect(wordCount(row.body)).toBeLessThanOrEqual(2400);
      }
    });
  });

  it('maps every published past row to a PostSummary-valid shape', () => {
    for (const row of published) {
      const summary = {
        id: '01900000-0000-7000-8000-000000000001',
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        authorName: row.authorName,
        tags: row.tags,
        publishedAt: row.publishedAt!.toISOString(),
        readingTimeMinutes: Math.max(1, Math.ceil(wordCount(row.body) / 200)),
        coverImage: row.coverImageUrl === null ? null : { url: row.coverImageUrl, alt: row.coverImageAlt },
      };
      const parsed = PostSummary.safeParse(summary);
      expect(parsed.success, `${row.slug}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    }
  });
});
