export type PaginationItem = number | 'gap';

const FULL_LIST_MAX = 7;

/** All numbers up to 7 pages; otherwise first, last, current +/- 1, and gaps. */
export function paginationItems(current: number, total: number): PaginationItem[] {
  if (total <= FULL_LIST_MAX) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const items: PaginationItem[] = [];
  let previous = 0;
  for (const n of pages) {
    if (n - previous > 1) items.push('gap');
    items.push(n);
    previous = n;
  }
  return items;
}
