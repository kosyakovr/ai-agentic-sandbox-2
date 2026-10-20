import { NextResponse, type NextRequest } from 'next/server';
import { getPostsPage } from '@/lib/posts';
import { parsePageParam } from '@/app/posts/helpers';

/**
 * Answers a real server-rendered 404 for a malformed or out-of-range `?page=`.
 * A `notFound()` thrown from the page itself ships an empty `__next_error__` shell
 * (the not-found UI then exists only in the RSC payload), so the check lives here and
 * rewrites to an unmatched path, which renders the root `not-found.tsx` with a 404 status.
 */
export async function proxy(request: NextRequest) {
  const values = request.nextUrl.searchParams.getAll('page');
  const parsed = parsePageParam(values.length > 1 ? values : values[0]);

  let missing = parsed.kind === 'not-found';
  if (parsed.kind === 'page' && parsed.page > 1) {
    const result = await getPostsPage(parsed.page);
    missing = result.kind === 'ok' && parsed.page > result.data.totalPages;
  }

  if (!missing) return NextResponse.next();
  return NextResponse.rewrite(new URL('/posts-not-found', request.url), { status: 404 });
}

export const config = { matcher: '/posts' };
