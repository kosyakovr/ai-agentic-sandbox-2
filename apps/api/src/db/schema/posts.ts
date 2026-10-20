/**
 * Ring 3 (infrastructure): Drizzle definition of the `posts` table.
 * Must not import the container or any module.
 * Rows never leave `db/` and the repositories; `PostRow` is for them only.
 */
import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const posts = pgTable(
  'posts',
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    slug: text().notNull().unique(),
    title: text().notNull(),
    excerpt: text().notNull(),
    body: text().notNull(),
    authorName: text().notNull(),
    tags: text().array().notNull().default(sql`'{}'`),
    coverImageUrl: text(),
    coverImageAlt: text(),
    status: text({ enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('posts_slug_chk', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(${t.slug}) <= 100`),
    check('posts_title_chk', sql`char_length(${t.title}) BETWEEN 1 AND 200`),
    check('posts_excerpt_chk', sql`char_length(${t.excerpt}) BETWEEN 1 AND 300`),
    check('posts_author_name_chk', sql`char_length(${t.authorName}) BETWEEN 1 AND 100`),
    check('posts_tags_chk', sql`cardinality(${t.tags}) <= 10`),
    check('posts_cover_image_alt_chk', sql`char_length(${t.coverImageAlt}) <= 200`),
    check('posts_status_chk', sql`${t.status} IN ('draft', 'published')`),
    check('posts_cover_pair_chk', sql`(${t.coverImageUrl} IS NULL) = (${t.coverImageAlt} IS NULL)`),
    check('posts_published_at_chk', sql`${t.status} <> 'published' OR ${t.publishedAt} IS NOT NULL`),
    index('posts_published_list_idx')
      .on(t.publishedAt.desc(), t.id.desc())
      .where(sql`${t.status} = 'published'`),
  ],
);

export type PostRow = typeof posts.$inferSelect;
