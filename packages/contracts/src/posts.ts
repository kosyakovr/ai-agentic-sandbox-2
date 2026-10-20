import { z } from 'zod';

export const POSTS_PAGE_MAX = 10000;
export const POSTS_PAGE_SIZE_DEFAULT = 12;
export const POSTS_PAGE_SIZE_MAX = 50;

const digitsInt = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

export const PostsListQuery = z.object({
  page: digitsInt(1, POSTS_PAGE_MAX).default(1),
  pageSize: digitsInt(1, POSTS_PAGE_SIZE_MAX).default(POSTS_PAGE_SIZE_DEFAULT),
});
export type PostsListQuery = z.output<typeof PostsListQuery>;

export const CoverImage = z.object({
  url: z.string().regex(/^\/(?!\/)\S*$/),
  alt: z.string().max(200),
});
export type CoverImage = z.infer<typeof CoverImage>;

export const PostSummary = z.object({
  id: z.uuid(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(300),
  authorName: z.string().min(1).max(100),
  tags: z
    .array(
      z
        .string()
        .min(1)
        .max(32)
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    )
    .max(10),
  publishedAt: z.iso.datetime(),
  readingTimeMinutes: z.number().int().min(1),
  coverImage: CoverImage.nullable(),
});
export type PostSummary = z.infer<typeof PostSummary>;

export const PostsListResponse = z.object({
  items: z.array(PostSummary),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
export type PostsListResponse = z.infer<typeof PostsListResponse>;
