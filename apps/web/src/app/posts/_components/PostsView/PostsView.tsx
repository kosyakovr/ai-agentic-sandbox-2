import { getPostsPage } from '@/lib/posts';
import { canonicalPath } from '../../helpers';
import { Pagination } from '../Pagination';
import { PostCard } from '../PostCard';
import { PostsError } from '../PostsError';
import styles from './PostsView.module.css';

export async function PostsView({ page }: { page: number }) {
  const result = await getPostsPage(page);

  if (result.kind === 'unavailable') return <PostsError href={canonicalPath(page)} />;

  const { items, totalItems, totalPages } = result.data;
  if (totalItems === 0) return <p>No posts yet.</p>;

  return (
    <>
      <ul className={styles.grid}>
        {items.map((post, index) => (
          <li key={post.id} className={styles.item}>
            <PostCard post={post} preloadCover={index === 0} />
          </li>
        ))}
      </ul>
      {totalPages > 1 ? <Pagination current={page} total={totalPages} /> : null}
    </>
  );
}
