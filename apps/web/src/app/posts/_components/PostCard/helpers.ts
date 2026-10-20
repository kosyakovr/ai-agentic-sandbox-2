const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export const VISIBLE_TAGS = 3;

export function formatPostDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function visibleTags(tags: string[]): { shown: string[]; more: number } {
  return { shown: tags.slice(0, VISIBLE_TAGS), more: Math.max(0, tags.length - VISIBLE_TAGS) };
}
