/**
 * The committed migration, read as text. Unit test: no database.
 * Oracles: plan § Test brief WP2.tests [T2], plan § Contract (DB shape), spec NFR-5 (inspection aid).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const drizzleDir = fileURLToPath(new URL('../drizzle/', import.meta.url));
const sqlFiles = readdirSync(drizzleDir).filter((name) => name.endsWith('.sql')).sort();
const migrationSql = sqlFiles.map((name) => readFileSync(`${drizzleDir}${name}`, 'utf8')).join('\n');

describe('the first migration', () => {
  it('creates the posts table', () => {
    expect(sqlFiles.length).toBeGreaterThanOrEqual(1);
    expect(migrationSql).toMatch(/CREATE TABLE "posts"/);
  });

  it('defines posts_published_list_idx on (published_at DESC, id DESC) for published rows only (NFR-5)', () => {
    const index = /CREATE INDEX "posts_published_list_idx" ON "posts"[^;]*/.exec(migrationSql)?.[0];
    expect(index, 'posts_published_list_idx is missing from the migration').toBeDefined();

    const columns = index!.match(/"(published_at|id)" DESC/g);
    expect(columns).toEqual(['"published_at" DESC', '"id" DESC']);
    expect(index).toMatch(/WHERE[^;]*"status"\s*=\s*'published'/);
  });

  it('is registered in the drizzle journal', () => {
    const journal = JSON.parse(readFileSync(`${drizzleDir}meta/_journal.json`, 'utf8')) as { entries: Array<{ tag: string }> };
    expect(journal.entries.length).toBeGreaterThanOrEqual(1);
    for (const entry of journal.entries) expect(sqlFiles).toContain(`${entry.tag}.sql`);
  });
});
