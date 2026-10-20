import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getServerConfig } from '@/lib/config';
import { getPostsPage } from '@/lib/posts';
import { canonicalPath, pageTitle, parsePageParam } from './helpers';
import { PostsView } from './_components/PostsView';
import styles from './page.module.css';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const parsed = parsePageParam((await searchParams).page);
  if (parsed.kind !== 'page') return {};
  const { page } = parsed;
  const canonical = new URL(canonicalPath(page), getServerConfig().SITE_URL).toString();
  const result = await getPostsPage(page);
  if (result.kind === 'unavailable') {
    return { title: 'Posts', alternates: { canonical }, robots: { index: false } };
  }
  return {
    title: pageTitle(page, result.data.totalPages),
    alternates: { canonical },
  };
}

export default async function PostsPage({ searchParams }: { searchParams: SearchParams }) {
  const parsed = parsePageParam((await searchParams).page);
  if (parsed.kind === 'first-redirect') permanentRedirect('/posts');
  if (parsed.kind === 'not-found') notFound();
  const { page } = parsed;

  // Every page waits for its data: page 1 is readable without JS, and an out-of-range page answers a real 404.
  const result = await getPostsPage(page);
  if (result.kind === 'ok' && page > result.data.totalPages) notFound();

  return (
    <div className={styles.page}>
      <h1>Posts</h1>
      <PostsView page={page} />
    </div>
  );
}
