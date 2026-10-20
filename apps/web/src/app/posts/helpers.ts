import { POSTS_PAGE_MAX } from '@blog/contracts/posts';

export type PageParam =
  | { kind: 'page'; page: number }
  | { kind: 'first-redirect' }
  | { kind: 'not-found' };

/** Canonical form only: `?page=1` redirects, `01`, arrays and junk are 404. */
export function parsePageParam(value: string | string[] | undefined): PageParam {
  if (value === undefined) return { kind: 'page', page: 1 };
  if (typeof value !== 'string') return { kind: 'not-found' };
  if (value === '1') return { kind: 'first-redirect' };
  if (!/^[1-9]\d*$/.test(value)) return { kind: 'not-found' };
  const page = Number(value);
  if (page > POSTS_PAGE_MAX) return { kind: 'not-found' };
  return { kind: 'page', page };
}

export function canonicalPath(page: number): string {
  return page <= 1 ? '/posts' : `/posts?page=${page}`;
}

export function pageTitle(page: number, totalPages: number | null): string {
  if (page <= 1 || totalPages === null) return 'Posts';
  return `Posts – Page ${page} of ${totalPages}`;
}
