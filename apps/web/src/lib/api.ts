import 'server-only';
import { PostsListResponse } from '@blog/contracts/posts';
import { getServerConfig } from '@/lib/config';

const API_TIMEOUT_MS = 5000;

type FailureReason = number | 'timeout' | 'network' | 'contract';

export class PostsApiError extends Error {
  constructor(readonly reason: FailureReason) {
    super(`posts api call failed: ${reason}`);
    this.name = 'PostsApiError';
  }
}

/** The only caller of the backend API. */
export async function fetchPostsPage(page: number, pageSize: number): Promise<PostsListResponse> {
  const url = new URL(`/posts?page=${page}&pageSize=${pageSize}`, getServerConfig().API_BASE_URL);

  const fail = (reason: FailureReason): never => {
    console.error(
      JSON.stringify({ msg: 'posts api call failed', url: url.toString(), reason, page }),
    );
    throw new PostsApiError(reason);
  };

  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(API_TIMEOUT_MS) });
  } catch (err) {
    return fail(err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : 'network');
  }
  if (!res.ok) return fail(res.status);

  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    return fail(err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : 'contract');
  }
  const parsed = PostsListResponse.safeParse(body);
  if (!parsed.success) return fail('contract');
  return parsed.data;
}
