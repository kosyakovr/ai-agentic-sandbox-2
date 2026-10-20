import 'server-only';
import { cache } from 'react';
import type { PostsListResponse } from '@blog/contracts/posts';
import { fetchPostsPage } from '@/lib/api';

export const POSTS_PAGE_SIZE = 12;
const FRESH_MS = 60_000;
const MAX_ENTRIES = 100;

export type PostsPageResult =
  | { kind: 'ok'; data: PostsListResponse }
  | { kind: 'unavailable' };

type Entry = { data: PostsListResponse; fetchedAt: number };

// One per server process: the proxy and the pages are separate bundles, so the maps
// live on a globalThis slot rather than in module scope. Map keeps insertion order,
// so the first key is the oldest.
type Slot = { store: Map<number, Entry>; inFlight: Map<number, Promise<PostsPageResult>> };
const SLOT_KEY = Symbol.for('@blog/web/posts-cache');
const slots = globalThis as unknown as Record<symbol, Slot | undefined>;
const slot = (slots[SLOT_KEY] ??= { store: new Map(), inFlight: new Map() });
const { store, inFlight } = slot;

function remember(page: number, data: PostsListResponse) {
  store.delete(page);
  store.set(page, { data, fetchedAt: Date.now() });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

async function load(page: number): Promise<PostsPageResult> {
  try {
    const data = await fetchPostsPage(page, POSTS_PAGE_SIZE);
    remember(page, data);
    return { kind: 'ok', data };
  } catch {
    // already logged by lib/api; serve the last good copy if there is one
    const stale = store.get(page);
    return stale ? { kind: 'ok', data: stale.data } : { kind: 'unavailable' };
  }
}

/** Posts page with a 60 s in-process cache, stale-on-error, deduped in-flight calls. */
export const getPostsPage = cache(async (page: number): Promise<PostsPageResult> => {
  const hit = store.get(page);
  if (hit && Date.now() - hit.fetchedAt < FRESH_MS) return { kind: 'ok', data: hit.data };

  const pending = inFlight.get(page);
  if (pending) return pending;

  const promise = load(page).finally(() => inFlight.delete(page));
  inFlight.set(page, promise);
  return promise;
});
