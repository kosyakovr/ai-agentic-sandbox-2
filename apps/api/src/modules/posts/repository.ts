/**
 * posts module, ring 3 (repository): the only file of the module that talks to Drizzle.
 * Maps rows to the `PublishedPost` domain type; any failure becomes `ServiceUnavailableError`.
 */
import { and, count, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { posts } from '../../db/schema/posts.js';
import { ServiceUnavailableError } from '../../platform/errors.js';

export interface PublishedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  authorName: string;
  tags: string[];
  body: string;
  publishedAt: Date;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
}

export class PostsRepository {
  constructor(private readonly db: Database) {}

  async listPublished(input: { limit: number; offset: number }): Promise<{ posts: PublishedPost[]; total: number }> {
    // The database clock decides visibility (a JS Date would drift from the stored instants).
    const visible = and(eq(posts.status, 'published'), sql`${posts.publishedAt} <= now()`);
    try {
      const [rows, totals] = await Promise.all([
        this.db
          .select({
            id: posts.id,
            slug: posts.slug,
            title: posts.title,
            excerpt: posts.excerpt,
            authorName: posts.authorName,
            tags: posts.tags,
            body: posts.body,
            publishedAt: posts.publishedAt,
            coverImageUrl: posts.coverImageUrl,
            coverImageAlt: posts.coverImageAlt,
          })
          .from(posts)
          .where(visible)
          // Matches posts_published_list_idx (drizzle-kit emits DESC NULLS LAST).
          .orderBy(sql`${posts.publishedAt} DESC NULLS LAST`, sql`${posts.id} DESC NULLS LAST`)
          .limit(input.limit)
          .offset(input.offset),
        this.db.select({ total: count() }).from(posts).where(visible),
      ]);
      return {
        posts: rows.flatMap((row) =>
          row.publishedAt
            ? [
                {
                  id: row.id,
                  slug: row.slug,
                  title: row.title,
                  excerpt: row.excerpt,
                  authorName: row.authorName,
                  tags: row.tags,
                  body: row.body,
                  publishedAt: row.publishedAt,
                  coverImageUrl: row.coverImageUrl,
                  coverImageAlt: row.coverImageAlt,
                },
              ]
            : [],
        ),
        total: totals[0]?.total ?? 0,
      };
    } catch (cause) {
      throw new ServiceUnavailableError({ cause });
    }
  }
}
