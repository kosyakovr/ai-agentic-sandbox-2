import Image from 'next/image';
import type { PostSummary } from '@blog/contracts/posts';
import { formatPostDate, visibleTags } from './helpers';
import styles from './PostCard.module.css';

const COVER_SIZES = '(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw';

export function PostCard({ post, preloadCover }: { post: PostSummary; preloadCover: boolean }) {
  const { shown, more } = visibleTags(post.tags);
  return (
    <article className={styles.card}>
      {post.coverImage ? (
        <div className={styles.cover}>
          <Image
            src={post.coverImage.url}
            alt={post.coverImage.alt}
            fill
            sizes={COVER_SIZES}
            preload={preloadCover}
            className={styles.image}
          />
        </div>
      ) : null}
      <div className={styles.body}>
        <h2 className={styles.title}>
          <a href={`/posts/${post.slug}`}>{post.title}</a>
        </h2>
        <p className={styles.excerpt}>{post.excerpt}</p>
        {shown.length > 0 ? (
          <ul aria-label="Tags" className={styles.tags}>
            {shown.map((tag) => (
              <li key={tag} className={styles.tag}>
                {tag}
              </li>
            ))}
            {more > 0 ? <li className={styles.tag}>+{more} more</li> : null}
          </ul>
        ) : null}
        <p className={styles.meta}>
          <span>{post.authorName}</span> ·{' '}
          <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time> ·{' '}
          <span>{post.readingTimeMinutes} min read</span>
        </p>
      </div>
    </article>
  );
}
