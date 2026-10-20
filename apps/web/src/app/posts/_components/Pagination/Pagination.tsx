import Link from 'next/link';
import { paginationItems } from './helpers';
import styles from './Pagination.module.css';

function pageHref(n: number) {
  return n === 1 ? ('/posts' as const) : { pathname: '/posts' as const, query: { page: String(n) } };
}

export function Pagination({ current, total }: { current: number; total: number }) {
  return (
    <nav aria-label="Pagination" className={styles.nav}>
      <ul className={styles.list}>
        <li>
          {current > 1 ? (
            <Link className={styles.box} href={pageHref(current - 1)}>
              Previous
            </Link>
          ) : (
            <span className={`${styles.box} ${styles.disabled}`}>Previous</span>
          )}
        </li>
        {paginationItems(current, total).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className={styles.gap}>
              …
            </li>
          ) : (
            <li key={item}>
              {item === current ? (
                <Link
                  className={`${styles.box} ${styles.current}`}
                  href={pageHref(item)}
                  aria-current="page"
                >
                  {item}
                </Link>
              ) : (
                <Link className={styles.box} href={pageHref(item)}>
                  {item}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          {current < total ? (
            <Link className={styles.box} href={pageHref(current + 1)}>
              Next
            </Link>
          ) : (
            <span className={`${styles.box} ${styles.disabled}`}>Next</span>
          )}
        </li>
      </ul>
      <p className={styles.status}>
        Page {current} of {total}
      </p>
    </nav>
  );
}
