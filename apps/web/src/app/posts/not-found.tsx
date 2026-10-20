import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false },
};

export default function PostsNotFound() {
  return (
    <div style={{ padding: '1.5rem 0 3rem' }}>
      <h1>Page not found</h1>
      <p>
        <Link href="/posts">Go to the first page</Link>
      </p>
    </div>
  );
}
