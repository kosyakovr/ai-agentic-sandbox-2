/**
 * Dev seed data, pure and deterministic: mulberry32(20261020) and in-repo word lists, no dependency.
 * Only `publishedAt` depends on `now`.
 */
export interface SeedPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  authorName: string;
  tags: string[];
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  status: 'draft' | 'published';
  publishedAt: Date | null;
}

const SEED = 20261020;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const WORDS = [
  'system', 'design', 'pattern', 'cache', 'latency', 'query', 'index', 'schema', 'service', 'queue', 'stream',
  'render', 'server', 'client', 'route', 'layout', 'token', 'build', 'deploy', 'metric', 'trace', 'signal',
  'module', 'contract', 'type', 'runtime', 'bundle', 'worker', 'thread', 'memory', 'network', 'protocol',
  'balance', 'scale', 'shard', 'replica', 'commit', 'branch', 'review', 'refactor', 'testing', 'release',
  'monitor', 'budget', 'feature', 'version', 'upgrade', 'migrate', 'storage', 'backup',
];
const TITLE_STARTS = ['Notes on', 'Rethinking', 'A practical guide to', 'Understanding', 'Lessons from', 'Why we love'];
const AUTHORS = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Edsger Dijkstra', 'Barbara Liskov', 'Donald Knuth'];
const TAGS = ['web', 'api', 'database', 'performance', 'testing', 'design', 'devops', 'security', 'frontend', 'backend', 'react', 'postgres'];
const COVER_ALTS = [
  'Abstract blue and violet gradient shapes',
  'Abstract green waves on a dark background',
  'Abstract orange and pink geometric blocks',
  'Abstract teal circles and lines',
];

/** Seeded PRNG: returns floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSeedPosts(now: Date): SeedPost[] {
  const rand = mulberry32(SEED);
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const pick = <T>(list: readonly T[]): T => list[int(0, list.length - 1)]!;
  const words = (n: number) => Array.from({ length: n }, () => pick(WORDS));
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const sentence = (n: number) => `${cap(words(n).join(' '))}.`;

  const makeBody = () => {
    const target = int(50, 2400);
    const out: string[] = [];
    let count = 0;
    while (count < target) {
      const n = Math.min(int(6, 14), target - count);
      out.push(sentence(n));
      count += n;
    }
    return out.join(' ');
  };

  const published: SeedPost[] = [];
  for (let i = 0; i < 50; i++) {
    const n = String(i + 1).padStart(2, '0');
    let title = `${pick(TITLE_STARTS)} ${words(int(2, 4)).join(' ')}`;
    // Edge rows, by index.
    if (i === 3) title = `${title} ${words(30).join(' ')} and the long road to a title that goes well past a hundred and fifty characters`;
    if (i === 4) title = `Handling ${'supercalifragilisticexpialidocious'.repeat(2)} words`;
    if (i === 5) title = 'Rendering <b>HTML</b> in a title';
    const tagCount = i === 6 || i === 7 ? 0 : i === 8 ? 10 : int(1, 5);
    const tags = tagCount === 10 ? TAGS.slice(0, 10) : [...new Set(Array.from({ length: tagCount }, () => pick(TAGS)))];
    const withCover = i !== 10 && i !== 11 && i !== 12 && i % 7 !== 0;
    const coverIndex = int(1, 4);
    // 1 h .. 364 d in the past, whole minutes.
    const ageMinutes = int(60, 364 * 24 * 60 - 1);
    published.push({
      slug: `seed-post-${n}`,
      title: title.slice(0, 200),
      excerpt: sentence(int(12, 30)).slice(0, 300),
      body: makeBody(),
      authorName: pick(AUTHORS),
      tags,
      coverImageUrl: withCover ? `/covers/cover-${coverIndex}.webp` : null,
      coverImageAlt: withCover ? COVER_ALTS[coverIndex - 1]! : null,
      status: 'published',
      publishedAt: new Date(Math.floor(now.getTime() / 60_000) * 60_000 - ageMinutes * 60_000),
    });
  }
  // Two posts share the same instant (tie-break by id).
  published[1]!.publishedAt = published[0]!.publishedAt;

  const draft: SeedPost = {
    slug: 'seed-draft-post',
    title: 'A draft that must never be listed',
    excerpt: sentence(12),
    body: makeBody(),
    authorName: AUTHORS[0]!,
    tags: ['web'],
    coverImageUrl: null,
    coverImageAlt: null,
    status: 'draft',
    publishedAt: null,
  };
  const scheduled: SeedPost = {
    slug: 'seed-scheduled-post',
    title: 'A scheduled post that is not live yet',
    excerpt: sentence(12),
    body: makeBody(),
    authorName: AUTHORS[1]!,
    tags: ['api'],
    coverImageUrl: '/covers/cover-1.webp',
    coverImageAlt: COVER_ALTS[0]!,
    status: 'published',
    publishedAt: new Date(now.getTime() + 30 * DAY_MS),
  };

  return [...published, draft, scheduled];
}
