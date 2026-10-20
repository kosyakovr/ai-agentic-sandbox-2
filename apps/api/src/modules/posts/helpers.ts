/** posts module: pure mapping from domain posts to the wire contract. */
import type { PostsListResponse, PostSummary } from '@blog/contracts/posts';
import { WORDS_PER_MINUTE } from './constants.js';
import type { PublishedPost } from './repository.js';

export function readingTimeMinutes(body: string): number {
  const words = body.split(/\s+/).filter((token) => token.length > 0).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function toPostSummary(post: PublishedPost): PostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    authorName: post.authorName,
    tags: post.tags,
    publishedAt: post.publishedAt.toISOString(),
    readingTimeMinutes: readingTimeMinutes(post.body),
    coverImage:
      post.coverImageUrl !== null && post.coverImageAlt !== null
        ? { url: post.coverImageUrl, alt: post.coverImageAlt }
        : null,
  };
}

export function toPostsListResponse(
  posts: PublishedPost[],
  total: number,
  page: number,
  pageSize: number,
): PostsListResponse {
  return {
    items: posts.map(toPostSummary),
    page,
    pageSize,
    totalItems: total,
    totalPages: Math.ceil(total / pageSize),
  };
}
