/**
 * Dev seed runner (ring 3, infrastructure): upserts the generated posts by slug in one transaction.
 * Must not import the container or any module.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { posts } from '../schema/posts.js';
import { generateSeedPosts } from './generate.js';

export async function runSeed(input: {
  databaseUrl: string;
  nodeEnv: string;
  now?: Date;
}): Promise<{ published: number; draft: number; scheduled: number }> {
  if (input.nodeEnv === 'production') throw new Error('db:seed refuses to run in production');

  const now = input.now ?? new Date();
  const rows = generateSeedPosts(now);
  const pool = new pg.Pool({ connectionString: input.databaseUrl, connectionTimeoutMillis: 3000 });
  try {
    const db = drizzle({ client: pool, casing: 'snake_case' });
    const found = await db.execute<{ present: string | null }>(sql`select to_regclass('public.posts') as present`);
    if (!found.rows[0]?.present) {
      throw new Error('posts table not found — run pnpm --filter @blog/api db:migrate first');
    }
    await db.transaction(async (tx) => {
      await tx
        .insert(posts)
        .values(rows)
        .onConflictDoUpdate({
          target: posts.slug,
          set: {
            title: sql.raw('excluded.title'),
            excerpt: sql.raw('excluded.excerpt'),
            body: sql.raw('excluded.body'),
            authorName: sql.raw('excluded.author_name'),
            tags: sql.raw('excluded.tags'),
            coverImageUrl: sql.raw('excluded.cover_image_url'),
            coverImageAlt: sql.raw('excluded.cover_image_alt'),
            status: sql.raw('excluded.status'),
            publishedAt: sql.raw('excluded.published_at'),
            updatedAt: now,
          },
        });
    });
  } finally {
    await pool.end();
  }

  const isPublished = (r: (typeof rows)[number]) => r.status === 'published';
  const scheduled = rows.filter((r) => isPublished(r) && r.publishedAt !== null && r.publishedAt > now).length;
  return {
    published: rows.filter(isPublished).length - scheduled,
    draft: rows.filter((r) => r.status === 'draft').length,
    scheduled,
  };
}
