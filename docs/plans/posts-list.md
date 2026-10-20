# Implementation Plan: Posts list
**Status:** approved (user · 2026-10-20)
**Spec:** docs/specs/posts-list.md
Areas: packages/contracts, apps/api, apps/web, root env template, README · Requirements: docs/specs/posts-list.md · Ticket: none

## Summary
This plan builds the whole feature on the empty skeleton. That covers the shared Zod contracts (`@blog/contracts/posts`, `@blog/contracts/errors`), the `posts` table with its first migration, the Fastify bootstrap (config, errors, container, app, server), the read-only `GET /posts` module, a seed with no new dependency (`db:seed`), and the server-rendered `/posts` page with cards, pagination, loading, empty, error and 404 states.

**Gates (6):**
- GT-1: first migration.
- GT-2: new contract files.
- GT-3: `db:seed` script in `apps/api/package.json`. No new dependency.
- GT-4: new env settings plus a separate `blog_test` database for integration tests.
- GT-5: README wording.
- GT-6: who supplies the cover images.

**Defaults you may want to overrule:**
- R-9: AC-17 and AC-25 cannot both hold on `/posts?page=N≥2`. A 404 status needs the data before the first byte is sent, so the loading state shows on `/posts` (page 1) only.
- R-8: the web keeps its 60 s and stale-on-error cache in memory, per server process.
- R-12: `page` above 10000 returns 404 on the web without calling the API.

**Top recommendation:** REC-1, reword README:27 so the bootstrap files and `src/db/` may import fastify and drizzle-orm.

**Execution mode — your choice needed:** multi-agent or single-agent? I recommend **multi-agent**. The change spans 3 areas and 8 work packages, adds a contract and a DB schema, and touches security-group files (env config, query input, data-driven `href`/`src`).

## Approval (user · 2026-10-20)
- Gates GT-1 to GT-6 approved; GT-6 option (a): the implementer generates 4 abstract WebP covers.
- REC-1 accepted: WP8 also rewords `README.md:27` (covered by GT-5). REC-2 and REC-3 rejected.
- R-9 default accepted: page 1 streams with placeholders; pages ≥ 2 await data so out-of-range pages return a real 404.
- R-8 and R-12 defaults stand.
- Execution mode: multi-agent.

## Fix-round decisions (user · 2026-10-21)
- Verification found AC-1 (readable without JS) and AC-17 (streamed loading state) cannot both hold. AC-17 is removed from the spec; D-8 / R-9 are superseded: every page, including page 1, awaits its data before rendering. No `<Suspense>` fallback, no skeleton.
- Integration tests run serially: `--no-file-parallelism` in the `@blog/api` `test` script; integration files return to the single `blog_test` database (per-file databases removed).

## Requirements review
| ID | Requirement (short) | Source | Verdict | Note / default taken |
|---|---|---|---|---|
| R-1 | `/posts` 200, server-rendered, one `article` per post, landmarks and headings | posts-list.md AC-1, NFR-9 | ok | — |
| R-2 | Card: h2 link to `/posts/{slug}`, excerpt, author, UTC date "Oct 20, 2026", "<n> min read", one Tab stop | AC-2, AC-3, AC-4, NFR-10 | ok | — |
| R-3 | Cover in a 16:9 box with alt, `srcset`, `sizes`; none when absent | AC-5, AC-6, A-14 | incomplete | No image assets exist (`apps/web/public/.gitkeep` only). Default (GT-6): the implementer generates 4 abstract 1600×900 WebP covers at `apps/web/public/covers/cover-{1..4}.webp` with the `sharp` already installed as Next's dependency (`node_modules/.pnpm/sharp@0.35.5_*`), as a one-off command with no manifest change. |
| R-4 | First 3 tags plus "+n more" in a list labelled "Tags"; no list when empty | AC-7, AC-8, A-15 | unclear | A-4 says "lowercase chars". Default: a tag matches `^[a-z0-9]+(-[a-z0-9]+)*$`, 1–32 chars. |
| R-5 | Full title, long words wrap, markup shown literally | AC-9, AC-10 | ok | Default: the seed adds one published post whose title contains `<b>HTML</b>`, so AC-10 can be demoed. |
| R-6 | 1/2/3 columns at 640/1024 px, dark tokens, contrast, 320 px reflow | AC-11, AC-12, NFR-7, NFR-12 | ok | — |
| R-7 | Empty: h1 "Posts", "No posts yet.", no nav | AC-13 | ok | — |
| R-8 | Error state, noindex, stale copy on failure, 5 s timeout, server log | AC-14, AC-15, AC-16, NFR-1, NFR-14 | ok | Default: the cache is an in-process map in the web server (per instance, at most 100 pages, last good copy kept with no expiry). The "Try again" link targets the canonical URL of the page (`/posts` or `/posts?page=N`). |
| R-9 | Loading state while posts are pending | AC-17 | conflict | It conflicts with AC-25: an out-of-range `?page=N` can only answer 404 if the page waits for the data before streaming starts (next-best-practices `error-handling.md` › Not found: "once a `<Suspense>` boundary has started streaming, the status stays 200"). Default: the `role="status"` loading state streams on `/posts` (page 1); `/posts?page=N≥2` waits up to 5 s with no loading state, and on client-side navigation the previous page stays visible until the new one arrives. |
| R-10 | Page N with "Page N of M", Pagination nav, `aria-current`, Previous/Next not links at the ends, more than 7 pages windowed, targets of at least 24 px | AC-18–AC-23, NFR-11 | ok | Default: "Page N of M" is shown whenever totalPages > 1, page 1 included. The AC-23 demo needs at least 97 listed posts, but the seed makes 50 (A-16), so the demo inserts extra rows by hand (TP-3). See REC-2. |
| R-11 | Pagination lands at the top of the page; keyboard order and visible focus | AC-24, NFR-8 | ok | — |
| R-12 | 404 for out-of-range or malformed `page`; 308 for `?page=1`; 307 for `/` | AC-25, AC-26, AC-27, AC-54 | ok | Default: on the web, a canonical `page` above 10000 (`POSTS_PAGE_MAX`) answers 404 without an API call, because the API would answer 400 (A-2). |
| R-13 | Canonical URL, other params ignored, titles, description, no noindex on a 200 list | AC-28–AC-32 | ok | Default: the error state's title is "Posts \| Blog" on every page, because M is unknown. |
| R-14 | `GET /posts` defaults, exact `PostSummary` keys, `coverImage: null` | AC-33, AC-39, AC-41 | ok | — |
| R-15 | Visibility filter, order publishedAt desc then id desc, offset paging, empty page past the end, index-served | AC-34–AC-37, NFR-5 | ok | — |
| R-16 | 400 problem with `errors[].param` | AC-38 | ok | `onion-architecture` §6 uses 422 for validation; the spec's 400 wins. Default: the API accepts decimal digits only (`^\d+$`), so `page=01` → 1, while `1e3`, `1.5` and repeated keys → 400. The leading-zero rule (AC-26) is web-only. |
| R-17 | Reading time max(1, ceil(words/200)) | AC-40 | ok | — |
| R-18 | `Cache-Control` 200 → `public, max-age=60`, 4xx/5xx → `no-store` | AC-42, AC-43 | ok | Default: unknown API routes also answer a 404 problem with `no-store`. |
| R-19 | 503 problem on DB failure with no internals; one log line per request; every 5xx logged with its error | AC-44, NFR-13 | ok | — |
| R-20 | DB rejects a duplicate slug, a published row without publishedAt, and half a cover | AC-45, AC-46, AC-47 | ok | — |
| R-21 | Seed: 50 published, 1 draft, 1 scheduled; edge rows; idempotent; refuses production and an unmigrated DB; API reports 50 | AC-48–AC-53, A-16 | ok | Default: no dependency. Content comes from an in-repo seeded PRNG (mulberry32, seed `20261020`) and word lists. The draft and scheduled slugs are fixed: `seed-draft-post`, `seed-scheduled-post`. |
| R-22 | At most 1 API call per page per 60 s; a new post visible within 120 s | NFR-2, NFR-3 | ok | Each stale entry triggers a blocking refetch, so freshness is at most 60 s on the web. |
| R-23 | LCP ≤ 2.5 s, CLS ≤ 0.1 (analysis) | NFR-4 | ok | Skeleton sized like the cards; `preload` on the first card's cover only. |
| R-24 | The browser requests only the web origin | NFR-6 | ok | Default: system font stack (no `next/font/google`), covers served from `public/` through `/_next/image`, API env vars without the `NEXT_PUBLIC_` prefix. |
| R-25 | API base URL and site URL are server settings; a missing one stops the app with a message naming it | § Contract (Tools), A-18 | unclear | Next has no guaranteed hard-fail start hook. Default: `src/instrumentation.ts` `register()` validates both, and the root layout's `metadataBase` reads `SITE_URL`, so `next build` fails without it. Verified by demo. |
| R-26 | README rule "hooks … the only callers of the API" reworded | A-17, S-3 (`README.md:12`) | ok | GT-5. |
| R-27 | Spec § Traceability row AC-23 is malformed: method and suite are merged into one cell (`posts-list.md:248`) | spec | incomplete | spec-lint printed nothing. Default: AC-23 is treated as `demo` with suite `—`. spec-creator fixes the row. |
| R-28 | `README.md:27` "Only repositories import drizzle-orm, only routes.ts imports fastify" | README.md:27 | conflict | The bootstrap (`src/app.ts`, `src/server.ts`) must import fastify, and `src/db/**` (schema, client, seed) must import drizzle-orm. Default: read the rule as scoped to `src/modules/**`, per `onion-architecture` §1 (ring ④ may import everything) and §7 (`db/` may import drizzle). See REC-1. |
| R-29 | API integration tests on real Postgres | spec § Traceability ("api it") | incomplete | The spec does not isolate the tests from the dev DB. Default (GT-4): `TEST_DATABASE_URL` points to a `blog_test` database on the same container, created and migrated by the test helper. |

## Goal
Readers get a server-rendered, responsive `/posts` list of published posts, newest first, with numbered pages. It is backed by a public `GET /posts` API endpoint over a new `posts` table, and a deterministic `db:seed` fills the dev DB so every list state can be seen.

## Non-goals
- No `/posts/[slug]` route file is created. `GET /posts/<any-slug>` answers 404 (A-24).
- No `app/page.tsx` is created. `/` is a redirect only.
- No file implements P-1–P-5: no `sitemap.ts` or RSS route, no web test runner, no focus-move code, no rate-limit plugin, no `ETag`/`Link` header.
- No POST, PUT, PATCH or DELETE route exists on the API.
- No `NEXT_PUBLIC_*` variable is added.
- No `<link rel="prev|next">` appears in any list page's `<head>`.
- No new entry appears under `dependencies` or `devDependencies` in any `package.json`, and `pnpm-lock.yaml` is unchanged.
- No `@fastify/cors` registration.

## What already exists (do not rebuild)
- Architecture rules: route and lib placement (`README.md:8-12`), API module slices and platform (`README.md:15-19`), test naming (`README.md:20`), contracts imported per file (`README.md:22-23`), dependency direction (`README.md:26-29`).
- Root scripts:
  - `typecheck`: `package.json:12`
  - `test`: `package.json:13`
  - `db:up`: `package.json:14`
- API scripts:
  - `dev`/`start` run `src/server.ts` with the root `.env`: `apps/api/package.json:7-8`
  - `test` = `vitest run`: `apps/api/package.json:10`
  - `db:generate`/`db:migrate`: `apps/api/package.json:11-12`
- API dependencies already installed: fastify 5, fastify-type-provider-zod 7, @fastify/helmet, pg, drizzle-orm, zod 4, pino-pretty, tsx, vitest (`apps/api/package.json:15-31`). The type provider exports `validatorCompiler`, `serializerCompiler`, `hasZodFastifySchemaValidationErrors` and `isResponseSerializationError`; a validation issue has `instancePath` = `/<path>` (`node_modules/.pnpm/fastify-type-provider-zod@7.0.0_*/…/dist/esm/errors.js:35`).
- Drizzle Kit config: loads the root `.env` (`apps/api/drizzle.config.ts:4-6`), schema dir `./src/db/schema` (`:10`), out `./drizzle` (`:11`), `casing: 'snake_case'` (`:15`).
- Migration journal is empty: `apps/api/drizzle/meta/_journal.json:1`.
- Postgres 18: `docker-compose.yml:5`. Env template: `.env.example:1-6`.
- Web: contracts transpiled and typed routes on (`apps/web/next.config.ts:4-5`), `@/*` alias (`apps/web/tsconfig.json:12-14`), typecheck runs `next typegen` (`apps/web/package.json:10`).
- `server-only` is declared by Next's types: `node_modules/.pnpm/next@16.4.2_*/node_modules/next/types/global.d.ts`.
- Contracts package exports `./*` → `./src/*.ts` (`packages/contracts/package.json:6-8`).
- Strict TS: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` (`tsconfig.base.json:9,11,12`), NodeNext modules for the API (`tsconfig.base.json:5-6`).
- Not present: no CLAUDE.md, AGENTS.md, INSIGHTS.md, CI workflow, linter config or `docs/architecture`.

## Contract
**API `GET /posts`** (no prefix):
- Query (`PostsListQuery`, other keys stripped):
  - `page`: digits only, 1–10000, default 1
  - `pageSize`: digits only, 1–50, default 12
  - A repeated key arrives as an array and fails validation.
- 200 `application/json` `PostsListResponse` `{ items: PostSummary[], page, pageSize, totalItems, totalPages }`, with `totalPages = ceil(totalItems/pageSize)` (0 when empty), plus `Cache-Control: public, max-age=60`.
- `PostSummary` `{ id: uuid, slug, title, excerpt, authorName, tags: string[], publishedAt: ISO-8601 with Z, readingTimeMinutes: int ≥ 1, coverImage: { url, alt } | null }`. Bounds per A-4 and R-4. `slug` matches `^[a-z0-9]+(-[a-z0-9]+)*$`; `coverImage.url` matches `^/(?!/)\S*$` (root-relative only).
- Errors are `application/problem+json` `ProblemDetails` `{ type: "about:blank", title, status, detail, errors?: [{ param, message }] }`, with `Cache-Control: no-store`. Titles:

  | Status | Title |
  |---|---|
  | 400 | "Bad request" (with `errors[]`) |
  | 404 | "Not found" |
  | 500 | "Internal server error" |
  | 503 | "Service unavailable" |

  `detail` is a fixed sentence per status, never error text.

**Shared schemas (one copy each, zod only):**
- `packages/contracts/src/posts.ts` exports:
  - `POSTS_PAGE_MAX = 10000`, `POSTS_PAGE_SIZE_DEFAULT = 12`, `POSTS_PAGE_SIZE_MAX = 50`
  - `PostsListQuery` (+ `type PostsListQuery = z.output<…>`)
  - `CoverImage`, `PostSummary`, `PostsListResponse`, with their `z.infer` types
- `packages/contracts/src/errors.ts` exports `ProblemDetails` and its type.
- Consumers: the API validates and serialises with them; the web parses the API body with `PostsListResponse`.

**API test seams (fixed now):**
- `apps/api/src/platform/config.ts`: `export function loadConfig(env?: Record<string, string | undefined>): AppConfig`. `AppConfig = { nodeEnv: 'development'|'test'|'production'; host: string; port: number; logLevel: string; databaseUrl: string }`. It throws an `Error` whose message names the invalid variable.
- `apps/api/src/app.ts`: `export async function buildApp(config: AppConfig, options?: { logger?: boolean }): Promise<FastifyInstance>`, ready to `inject()`. `app.close()` closes the DB pool.

**DB shape** (table `posts`, snake_case; first migration `apps/api/drizzle/0000_*.sql`):

| Column | Definition |
|---|---|
| `id` | uuid PK default `uuidv7()` |
| `slug` | text NOT NULL UNIQUE, CHECK format and ≤ 100 |
| `title` | text NOT NULL, CHECK 1–200 |
| `excerpt` | text NOT NULL, CHECK 1–300 |
| `body` | text NOT NULL |
| `author_name` | text NOT NULL, CHECK 1–100 |
| `tags` | text[] NOT NULL default `'{}'`, CHECK `cardinality(tags) <= 10` |
| `cover_image_url` | text NULL |
| `cover_image_alt` | text NULL, CHECK ≤ 200 |
| `status` | text NOT NULL default `'draft'`, CHECK in (`draft`,`published`) |
| `published_at` | timestamptz NULL |
| `created_at`, `updated_at` | timestamptz NOT NULL default `now()` |

Table-level constraints:
- CHECK `(cover_image_url IS NULL) = (cover_image_alt IS NULL)`
- CHECK `status <> 'published' OR published_at IS NOT NULL`
- Index `posts_published_list_idx ON posts (published_at DESC, id DESC) WHERE status = 'published'`

**Commands and env:**
- `pnpm --filter @blog/api db:seed` = `tsx --env-file=../../.env src/db/seed/cli.ts`. It exits 0 and prints the counts, or exits 1 with a message on stderr.
- New root env keys:
  - `API_HOST` (default `127.0.0.1`), `API_PORT` (default `3001`), `LOG_LEVEL` (default `info`)
  - `API_BASE_URL` (required, web), `SITE_URL` (required, web)
  - `TEST_DATABASE_URL` (tests only)

**Web URLs:**
- `/` → 307 `/posts` (next.config `redirects`)
- `/posts`, `/posts?page=N`
- `/posts?page=1` → 308 `/posts`
- Malformed or out-of-range `page` → 404 rendering `app/posts/not-found.tsx`

No client component is introduced.

## Decisions taken
| Decision | Why | Rejected alternative |
|---|---|---|
| `posts` module = `routes.ts` + `repository.ts` + `helpers.ts` + `constants.ts`, no `service.ts` | read-only, one table (`onion-architecture` §12) | pass-through service |
| Repository wraps every DB/pg error in `ServiceUnavailableError` (503) | AC-44; keeps pg errors out of the boundary (`onion-architecture` §6, §7) | mapping pg error codes in the error handler |
| Validation → 400 | spec AC-38 | 422 from the `onion-architecture` §6 example |
| `id uuid default uuidv7()` | contract says uuid; PG18 (`docker-compose.yml:5`); time-ordered | `bigint identity` (contract change) |
| `status text + CHECK` | `postgresql-table-design` › Data Types (evolving statuses) | `pgEnum` |
| One partial composite index on the filter and order | NFR-5; count and page both use it | full-table index on `published_at` |
| Web cache: in-process map in `lib/posts.ts`, fresh for 60 s, last good copy served on failure, in-flight requests deduped, at most 100 pages | AC-16 and NFR-2 with explicit semantics that are the same in dev and prod | `fetch` `next.revalidate` / `unstable_cache` (stale-on-error not stated in `next-best-practices` data-patterns.md; `unstable_cache` replaced); `cacheComponents` (the PPR shell streams first, so 404 statuses are lost: `suspense-boundaries.md` › Placement rules) |
| Page 1 streams in `<Suspense>`; page ≥ 2 awaits data before rendering; no `loading.tsx` | R-9 | `loading.tsx` (fixes every status at 200) |
| `/` redirect in `next.config.ts` `redirects()` (`permanent: false`); `?page=1` → `permanentRedirect('/posts')` in the page | a config redirect passes the query through, so `?page=1` would loop | `proxy.ts` (no other use for it) |
| `next.config.ts` loads the root `.env` with `process.loadEnvFile`, the same pattern as `apps/api/drizzle.config.ts:4-6` | one env file for both apps (S-5) | `apps/web/.env` duplicate |
| Card title link is a plain `<a href="/posts/{slug}">` | `typedRoutes` (`next.config.ts:5`) rejects a route that does not exist; avoids prefetching 12 known 404s | `next/link` with an `as Route` cast |
| Seed uses an in-repo PRNG and word lists, upserts by slug in one transaction | A-16 deterministic; no dependency (caller preference) | `@faker-js/faker` (dependency gate) |
| One request log line from an `onResponse` hook, with `disableRequestLogging: true` | NFR-13 asks for the five fields on one line; Fastify's default logs two | default request logging |
| API env names `API_HOST`/`API_PORT` | `next dev` also reads `PORT`, and the root `.env` is shared | `PORT` |
| No CORS plugin | the browser never calls the API (NFR-6) | allowlist CORS |
| System font stack | NFR-6; the build needs no network | `next/font/google` |

## Gates — need user approval before implementation
- [x] GT-1 **First migration.** Add `src/db/schema/posts.ts`, run `pnpm --filter @blog/api db:generate` to create `apps/api/drizzle/0000_*.sql` and update `meta/_journal.json`, and apply it to the dev DB with `db:migrate`. This is the first schema change and touches the migration directory (S-5, `README.md:37-38`).
- [x] GT-2 **New contract files.** `@blog/contracts/posts` and `@blog/contracts/errors`: a new public wire contract shared by both apps.
- [x] GT-3 **Package manifest.** Add `"db:seed"` to `apps/api/package.json` scripts. No dependency is added; `pnpm-lock.yaml` is untouched.
- [x] GT-4 **Env settings and test database.** Add `API_HOST`, `API_PORT`, `LOG_LEVEL`, `API_BASE_URL`, `SITE_URL`, `TEST_DATABASE_URL=postgres://blog:blog@localhost:5433/blog_test` to `.env.example`. You add them to your own `.env`. Integration tests create and migrate a `blog_test` database on the dev container.
- [x] GT-5 **README wording.** `README.md:12` changes from "the only callers of the API" to the A-17 reading ("`src/lib/api.ts` is the only caller of the API; server-rendered pages read through `src/lib/*`"). Getting started gains the `db:seed` step.
- [x] GT-6 **Cover images.** Either (a) the implementer generates 4 abstract WebP covers with the transitively installed `sharp` as a one-off command (default), or (b) you supply 4 images (1600×900, any of JPEG/PNG/WebP) named `cover-1..4.webp`.

## Work packages
### WP1 — Shared contracts   [packages/contracts · group B, F]
- **Implements:** R-14, R-16, R-4 (bounds), R-24 (root-relative cover URL)
- **Files:** create `packages/contracts/src/posts.ts` · create `packages/contracts/src/errors.ts`
- **Skills to apply:** engineering-paved-path:zod (`schema-string-validations`, `type-use-z-infer`, `type-export-schemas-and-types`, `type-input-vs-output`, `object-strict-vs-strip`, `object-optional-vs-nullable`, `refine-defaults`); engineering-paved-path:onion-architecture §8; engineering-paved-path:frontend-ui-architecture §9; engineering-paved-path:typescript-expert › Strict by Default
- **Constraints:** imports only `zod` (`README.md:29`). Relative imports use the `.js` suffix (NodeNext, `tsconfig.base.json:5-6`). `exactOptionalPropertyTypes` (`tsconfig.base.json:11`) applies to `errors?`. GT-2.
- **Steps:**
  1. In `posts.ts`, write the constants and schemas exactly as in § Contract.
  2. Build each integer query param as `z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(lo).max(hi))` with `.default(n)`.
  3. Use `z.object` (strip) everywhere, `z.uuid()`, and `z.iso.datetime()` (Z only).
  4. Make `coverImage` `CoverImage.nullable()`.
  5. Export the output types with `z.infer`, and `z.output` for the query.
  6. Write `errors.ts` with `ProblemDetails`.
- **Done when:** both files exist, they import only `zod`, and `pnpm -r typecheck` passes for `@blog/contracts`.
- **Tests:** see Test brief WP1.tests

### WP2 — `posts` table, DB client, first migration   [apps/api · group B]
- **Implements:** R-20, R-15 (NFR-5)
- **Files:** create `apps/api/src/db/schema/posts.ts` · create `apps/api/src/db/client.ts` · create (generated) `apps/api/drizzle/0000_*.sql`, `apps/api/drizzle/meta/0000_snapshot.json` · modify (generated) `apps/api/drizzle/meta/_journal.json`
- **Skills to apply:** engineering-paved-path:drizzle-orm-patterns › Best Practices, `references/schema-definition.md` (Indexes and Constraints), `references/migrations.md` (CLI Commands); engineering-paved-path:postgresql-table-design › Core Rules, Data Types, Constraints, Indexing (Composite, Partial); engineering-paved-path:onion-architecture §3 (table in `db/schema/`), §7
- **Constraints:**
  - GT-1.
  - Write TS keys in camelCase without explicit column names: Drizzle Kit maps them to snake_case (`drizzle.config.ts:15`), and the runtime client must pass `casing: 'snake_case'` too.
  - Give every CHECK and the index an explicit name (`posts_*_chk`, `posts_published_list_idx`).
- **Steps:**
  1. Define `posts` with `pgTable` per § Contract. Use `.default(sql\`uuidv7()\`)`, `text({ enum: ['draft','published'] })`, `text().array().notNull().default(sql\`'{}'\`)`, `timestamp({ withTimezone: true })`, `check(...)` and `index(...).on(t.publishedAt.desc(), t.id.desc()).where(sql\`${t.status} = 'published'\`)`.
  2. Export `type PostRow = typeof posts.$inferSelect` (`onion-architecture` §7).
  3. In `client.ts`, export `createDatabase(url: string, onPoolError: (err: Error) => void): { db: Database; close(): Promise<void> }`. It builds a `pg.Pool` with `connectionTimeoutMillis: 3000` and wires `pool.on('error', onPoolError)` so an idle-client error cannot crash the process. It returns `drizzle({ client: pool, casing: 'snake_case' })` and `export type Database`.
  4. Run `pnpm --filter @blog/api db:generate`. Check that the SQL has every CHECK, the UNIQUE on `slug`, the partial index and `DEFAULT uuidv7()`.
  5. Apply the migration with `pnpm --filter @blog/api db:migrate`.
- **Done when:** `apps/api/drizzle/0000_*.sql` contains `CREATE TABLE "posts"`, the five CHECKs, the UNIQUE on `slug` and `posts_published_list_idx … WHERE`, and `_journal.json` has 1 entry.
- **Tests:** see Test brief WP2.tests

### WP3 — API bootstrap   [apps/api · group A, E, F]
- **Implements:** R-18, R-19, R-16 (error translation), R-25 (API side)
- **Files:** create `apps/api/src/platform/config.ts`, `apps/api/src/platform/errors.ts`, `apps/api/src/platform/container.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/modules/index.ts` · modify `.env.example`
- **Skills to apply:**
  - engineering-paved-path:onion-architecture §1, §3, §5 (no port: the DB is not behind one, §12), §6 (order in `app.ts`, one translator), §10 (`process.env` only in config)
  - engineering-paved-path:fastify-best-practices `rules/error-handling.md` (Custom Error Handler, Validation Error Customization, Not Found Handler), `rules/logging.md` (Request Logging Configuration, Request ID Tracking, Logging Errors), `rules/plugins.md`, `rules/typescript.md`
  - engineering-paved-path:zod `parse-validate-early`
  - engineering-paved-path:security §4 (A02: generic errors), §11 (A09: never log `DATABASE_URL` or the config object), §12 (A10)
- **Constraints:**
  - Security-group files: `config.ts`, `app.ts`.
  - `platform/errors.ts` imports no fastify, so it is safe for repositories (`onion-architecture` §1).
  - `modules/index.ts` exports a plain array of route plugins and imports no fastify (`README.md:27`, R-28).
  - GT-4 for `.env.example`.
- **Steps:**
  1. **`config.ts`.** Write `loadConfig` as a zod object over the env (`NODE_ENV` enum, default `development`; `API_HOST` default `127.0.0.1`; `API_PORT` coerced int 1–65535, default 3001; `LOG_LEVEL` default `info`; `DATABASE_URL` required URL). On failure it throws `Error("Invalid environment: <VAR> <reason>")`.
  2. **`errors.ts`.** Write `AppError(status, title, detail, { cause })`, `ServiceUnavailableError` (503, "Service unavailable") and `toProblem(status, title, detail, errors?)`. These are pure.
  3. **`container.ts`.** `createContainer(config, logger)` builds the database once (`createDatabase(config.databaseUrl, err => logger.error({ err }, 'pg pool error'))`) and `postsRepository = new PostsRepository(db)`. `close()` ends the pool.
  4. **`app.ts`.** `buildApp` registers, in this order:
     1. `Fastify({ logger: options.logger === false ? false : { level, transport: pino-pretty in development }, disableRequestLogging: true, genReqId: () => randomUUID() })`
     2. `setValidatorCompiler` / `setSerializerCompiler` from fastify-type-provider-zod
     3. Build the container, `decorate('container')` with module augmentation, and close it in `onClose`
     4. `@fastify/helmet`
     5. `onResponse` hook logging `{ reqId, method, path (url without query), statusCode, durationMs: reply.elapsedTime }`
     6. `setErrorHandler`:
        - `hasZodFastifySchemaValidationErrors` → 400, `errors[] = { param: instancePath.slice(1).split('/')[0], message }`
        - `AppError` → its status
        - `isResponseSerializationError` or anything else → 500
        - other Fastify 4xx `statusCode` → that status with a generic title
        - Every branch sets `type('application/problem+json')` and `header('cache-control','no-store')`; status ≥ 500 → `request.log.error({ err })`.
     7. `setNotFoundHandler` → 404 problem, `no-store`
     8. The modules from `modules/index.ts`
  5. **`server.ts`.** `loadConfig()` inside try/catch (`console.error(message)`, `process.exitCode = 1` on failure) → `buildApp` → `listen({ host, port })`. On SIGINT/SIGTERM it runs `app.close()`.
  6. **`.env.example`.** Append the GT-4 keys with comments: web-only, tests-only, never `NEXT_PUBLIC_`.
- **Done when:**
  - `pnpm --filter @blog/api dev` with `DATABASE_URL` unset exits non-zero and prints a line containing `DATABASE_URL`.
  - With the env set it listens on `API_PORT`.
  - `GET /nope` returns 404 `application/problem+json` with `cache-control: no-store`.
- **Tests:** see Test brief WP3.tests

### WP4 — `posts` module: `GET /posts`   [apps/api · group A, B, E]
- **Implements:** R-14, R-15, R-16, R-17, R-18, R-19
- **Files:** create `apps/api/src/modules/posts/routes.ts`, `repository.ts`, `helpers.ts`, `constants.ts` · modify `apps/api/src/modules/index.ts` (register `postsRoutes`)
- **Skills to apply:**
  - engineering-paved-path:onion-architecture §2 (docblock naming the layer, no empty files), §4, §6, §7 (hand-written mapper, row → domain in the repository, no `$inferSelect` above it), §12
  - engineering-paved-path:fastify-best-practices `rules/routes.md`, `rules/schemas.md` (Validation Error Handling)
  - engineering-paved-path:drizzle-orm-patterns `references/queries-joins-aggregations.md` (Pagination, Aggregations)
  - engineering-paved-path:postgresql-table-design › Indexing
  - engineering-paved-path:zod `parse-avoid-double-validation`
  - engineering-paved-path:security §7 (A05: queries only through the Drizzle builder), §16 (always `.limit()`)
- **Constraints:**
  - `routes.ts` is the only file importing fastify, and it imports no drizzle-orm (`README.md:27`).
  - The visibility filter uses the database clock: `sql\`now()\``, not a JS `Date` (AC-34).
  - `routes.ts` is security-group: query input.
- **Steps:**
  1. **`constants.ts`.** `LIST_CACHE_CONTROL = 'public, max-age=60'`, `WORDS_PER_MINUTE = 200`.
  2. **`repository.ts`.** `class PostsRepository { constructor(db: Database) }` with `listPublished({ limit, offset }): Promise<{ posts: PublishedPost[]; total: number }>`.
     - It runs, concurrently, a count and a page query that select only the summary columns plus `body` with `where status='published' and published_at <= now()` and `orderBy(desc(publishedAt), desc(id)).limit().offset()`.
     - It maps rows to the `PublishedPost` domain type and wraps any thrown error in `ServiceUnavailableError({ cause })`.
  3. **`helpers.ts`** (pure).
     - `readingTimeMinutes(body)`: whitespace tokens, `max(1, ceil(n/200))`.
     - `toPostSummary(post)`: field by field; `publishedAt.toISOString()`; `coverImage` is `null` unless both URL and alt are set.
     - `toPostsListResponse(posts, total, page, pageSize)`.
  4. **`routes.ts`.** A default-export `FastifyPluginAsyncZod` with `GET /posts`, `schema: { querystring: PostsListQuery, response: { 200: PostsListResponse, 400: ProblemDetails, 500: ProblemDetails, 503: ProblemDetails } }`. The handler:
     1. Calls `app.container.postsRepository.listPublished({ limit: pageSize, offset: (page-1)*pageSize })`.
     2. Sets `cache-control` to `LIST_CACHE_CONTROL`.
     3. Returns `toPostsListResponse(...)`.
- **Done when:** with a migrated DB, `curl -i localhost:3001/posts` returns 200, a `PostsListResponse` body and `cache-control: public, max-age=60`, and its `[T1]` tests pass.
- **Tests:** see Test brief WP4.tests

### WP5 — Dev seed   [apps/api · group B, F]
- **Implements:** R-21, R-5 (markup title), R-3 (cover URLs)
- **Files:** create `apps/api/src/db/seed/generate.ts`, `apps/api/src/db/seed/run.ts`, `apps/api/src/db/seed/cli.ts` · modify `apps/api/package.json` (script only, GT-3)
- **Skills to apply:** engineering-paved-path:drizzle-orm-patterns `references/transactions.md`, `references/common-patterns.md` (Upsert, but see Constraints); engineering-paved-path:postgresql-table-design › Upsert-Friendly Design; engineering-paved-path:onion-architecture §7 (drizzle only under `db/`), §3; engineering-paved-path:security §4 (A02: seeds must not run in production); engineering-paved-path:typescript-expert › Code Review Checklist
- **Constraints:**
  - The skill's upsert example (`common-patterns.md:33-49`, `onConflict(...)`) is not the drizzle-orm 0.45 API. Use `.onConflictDoUpdate({ target: posts.slug, set: { …: sql.raw('excluded.<col>') } })`, which exists (`node_modules/.pnpm/drizzle-orm@0.45.4_pg@8.23.1/…/pg-core/query-builders/insert.d.ts`).
  - Read env only through `loadConfig` (`onion-architecture` §10).
  - No dependency is added.
- **Steps:**
  1. **`generate.ts`** (pure). `generateSeedPosts(now: Date): SeedPost[]` returns 52 rows from mulberry32(20261020) and in-repo word lists:
     - 50 published with `publishedAt` in [now − 364 d, now − 1 h], 2 of them with an identical instant
     - `seed-draft-post` (draft, `publishedAt` null)
     - `seed-scheduled-post` (published, now + 30 d)
     - at least 3 without cover, 1 title ≥ 150 chars, 1 title with a 40+ char unbroken word, 1 title containing `<b>HTML</b>`, at least 2 with `tags: []`, 1 with 10 tags
     - bodies of 50–2400 words; covers `/covers/cover-{1..4}.webp` with alt text
     - slugs fixed and unique
  2. **`run.ts`.** `runSeed({ databaseUrl, nodeEnv, now = new Date() }): Promise<{ published: number; draft: number; scheduled: number }>`:
     1. If `nodeEnv === 'production'`, throw `Error('db:seed refuses to run in production')` before connecting.
     2. Connect.
     3. If `select to_regclass('public.posts')` is null, throw `Error('posts table not found — run pnpm --filter @blog/api db:migrate first')`.
     4. Upsert the 52 rows in one transaction with `updatedAt = now`; other rows are untouched.
     5. Close the pool.
  3. **`cli.ts`.** `loadConfig()` → `runSeed` → print `Seeded 52 posts (50 published, 1 draft, 1 scheduled)`. On any error, print the message to stderr and set `process.exitCode = 1`.
  4. **`package.json`.** Add `"db:seed": "tsx --env-file=../../.env src/db/seed/cli.ts"`.
- **Done when:** `pnpm --filter @blog/api db:seed` exits 0 twice in a row on the migrated dev DB, and its `[T1]` tests pass.
- **Tests:** see Test brief WP5.tests

### WP6 — Web foundation: config, API client, cache, layout, tokens   [apps/web · group C, D, E]
- **Implements:** R-8, R-22, R-24, R-25, R-6 (tokens), R-11 (skip link, focus), R-3 (assets), R-12 (`/` redirect)
- **Files:**
  - modify `apps/web/next.config.ts`
  - create `apps/web/src/instrumentation.ts`, `apps/web/src/lib/config.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/posts.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`
  - create `apps/web/public/covers/cover-{1..4}.webp` (GT-6)
- **Skills to apply:**
  - engineering-paved-path:frontend-ui-architecture §1, §5 (config validated once, no `process.env` elsewhere), §6 (no `utils.ts`), §7 (tier 3 data access), §10, §12 (server-only data access)
  - engineering-paved-path:next-best-practices `SKILL.md` rules 2, 9; `rsc-boundaries.md` (Keeping server code and secrets on the server); `data-patterns.md` (Fetching on the server, Data security); `metadata.md` (Core rules, Titles and the root layout); `file-conventions.md` (Other top-level files)
  - engineering-paved-path:react-best-practices §13
  - engineering-paved-path:zod `parse-never-trust-json`, `parse-use-safeparse`
  - engineering-paved-path:security §4 (A02: server-only env), §11 (log without secrets)
- **Constraints:**
  - `lib/config.ts`, `lib/api.ts` and `lib/posts.ts` start with `import 'server-only'`.
  - Only `lib/config.ts` reads `process.env` (frontend-ui-architecture §13).
  - `lib/api.ts` is the only module that calls the API (A-17, GT-5).
  - Imports use the `@/` alias (`apps/web/tsconfig.json:12-14`).
  - Security-group files: `next.config.ts`, `lib/config.ts`, `lib/api.ts`.
- **Steps:**
  1. **`next.config.ts`.** Load `../../.env` if it exists (pattern of `apps/api/drizzle.config.ts:4-6`). Add `async redirects()` → `[{ source: '/', destination: '/posts', permanent: false }]`. Keep `transpilePackages` and `typedRoutes`.
  2. **`lib/config.ts`.** `getServerConfig()`, memoised: zod `{ API_BASE_URL: z.url(), SITE_URL: z.url() }`. It throws `Error('Missing or invalid env: <VAR>')`.
  3. **`instrumentation.ts`.** `register()` calls `getServerConfig()`.
  4. **`lib/api.ts`.** `fetchPostsPage(page, pageSize): Promise<PostsListResponse>`:
     - `fetch(new URL(\`/posts?page=${page}&pageSize=${pageSize}\`, API_BASE_URL), { cache: 'no-store', signal: AbortSignal.timeout(5000) })`
     - non-2xx, timeout, network error or `PostsListResponse.safeParse` failure → `console.error(JSON.stringify({ msg: 'posts api call failed', url, reason: <status | 'timeout' | 'network' | 'contract'>, page }))`, then throw `PostsApiError`
  5. **`lib/posts.ts`.**
     - `POSTS_PAGE_SIZE = 12`.
     - `getPostsPage = cache(async (page) => …)`, using React `cache` for per-request memoisation, with a module-level `Map<number, { data, fetchedAt }>`.
     - fresh (< 60 s) → return it; otherwise call the API through one shared in-flight promise per page.
     - success → store it (evict the oldest entry above 100).
     - failure → return the stored copy if there is one, else `{ kind: 'unavailable' }`.
     - Result type `{ kind: 'ok'; data: PostsListResponse } | { kind: 'unavailable' }`.
  6. **`layout.tsx`.**
     - `<html lang="en">` with, in order: a "Skip to content" link to `#main` (first focusable element), a `header` with a link "Blog" → `/posts`, and `<main id="main">{children}</main>`.
     - `metadata`: `metadataBase: new URL(getServerConfig().SITE_URL)`, `title: { template: '%s | Blog', default: 'Blog' }`, `description: 'Latest posts from Blog.'`.
     - `viewport`: `colorScheme: 'light dark'`.
  7. **`globals.css`.** Light and dark tokens via `prefers-color-scheme` (text contrast ≥ 4.5:1, UI and focus ≥ 3:1), system font stack, a visually-hidden-until-focus skip link, `:focus-visible` outline, `max-width: 1200px` content wrapper.
  8. **Covers.** Produce the 4 WebP covers per GT-6.
- **Done when:**
  - `curl -I localhost:3000/` returns 307 with `location: /posts`.
  - `pnpm --filter @blog/web build` fails with a message naming `SITE_URL` when it is unset and succeeds when it is set.
  - `apps/web/public/covers/` holds 4 `.webp` files.
- **Tests:** see Test brief WP6.tests

### WP7 — `/posts` page, card, pagination, states   [apps/web · group C, D, E]
- **Implements:** R-1, R-2, R-3, R-4, R-5, R-6, R-7, R-8, R-9, R-10, R-11, R-12, R-13, R-23
- **Files:**
  - create `apps/web/src/app/posts/page.tsx`, `page.module.css`, `helpers.ts`, `not-found.tsx`
  - create `_components/PostsView/{PostsView.tsx,PostsView.module.css,index.ts}`
  - create `_components/PostCard/{PostCard.tsx,PostCard.module.css,helpers.ts,index.ts}`
  - create `_components/Pagination/{Pagination.tsx,Pagination.module.css,helpers.ts,index.ts}`
  - create `_components/PostsSkeleton/{PostsSkeleton.tsx,PostsSkeleton.module.css,index.ts}`
  - create `_components/PostsError/{PostsError.tsx,index.ts}`
  - all `_components` paths are under `apps/web/src/app/posts/`
- **Skills to apply:**
  - engineering-paved-path:frontend-ui-architecture §1, §2 (route-local first), §3, §4, §12 (thin page)
  - engineering-paved-path:next-best-practices `async-patterns.md` (What is async in Next.js 16, Type with the generated helpers), `suspense-boundaries.md` (Placement rules, Fallback design), `error-handling.md` (Not found, forbidden, unauthorized; redirect() and try/catch), `metadata.md` (Core rules, Streaming and Cache Components), `image.md` (Core rules, Responsive images with fill + sizes), `hydration-error.md`
  - engineering-paved-path:react-best-practices §1, §5, §11 (key = `post.id`), §12, §13
  - engineering-paved-path:security §7 (A05 XSS: no `dangerouslySetInnerHTML`; `href`/`src` come only from contract-validated slug and root-relative URL)
- **Constraints:**
  - Server Components only, no `'use client'`.
  - `react-best-practices` §8 "fetch in hooks" is overridden by `frontend-ui-architecture` §7/§12: server data comes from `@/lib/posts`.
  - `notFound()` and `permanentRedirect()` are called outside any try/catch and before any Suspense boundary (`error-handling.md`).
  - No `loading.tsx` in `app/` or `app/posts/` (R-9).
  - Pagination uses `Link` with `href={{ pathname: '/posts', query: { page: String(n) } }}`, or `'/posts'` for page 1 (typed routes, `next.config.ts:5`).
- **Steps:**
  1. **`helpers.ts`.**
     - `parsePageParam(v: string | string[] | undefined)` → `{ kind: 'page', page } | { kind: 'first-redirect' } | { kind: 'not-found' }`. The rules:
       - undefined → page 1
       - `'1'` → first-redirect
       - `^[1-9]\d*$` and ≤ `POSTS_PAGE_MAX` → page
       - everything else, an array included → not-found
     - `canonicalPath(page)` and `pageTitle(page, totalPages)` → `'Posts'` or `'Posts – Page N of M'`.
  2. **`page.tsx`.**
     - `generateMetadata`: canonical via `alternates.canonical`, title, and `robots: { index: false }` only when the result is `unavailable`. It shares the memoised `getPostsPage`.
     - The page awaits `searchParams` and parses: `first-redirect` → `permanentRedirect('/posts')`; `not-found` → `notFound()`.
     - Page 1: `<h1>Posts</h1>` plus `<Suspense fallback={<PostsSkeleton/>}><PostsView page={1}/></Suspense>`.
     - Page ≥ 2: await `getPostsPage(n)`; if `ok` and `n > totalPages`, call `notFound()`; else render `<h1>Posts</h1><PostsView page={n}/>`.
  3. **`PostsView`.**
     - `unavailable` → `<PostsError href={canonicalPath(page)}/>` ("Posts couldn't be loaded." plus a link "Try again").
     - `totalItems === 0` → `<p>No posts yet.</p>`.
     - Otherwise a list grid of `PostCard`, then `Pagination` when `totalPages > 1`.
     - The grid is 1 column, 2 from 640 px, 3 from 1024 px, with `min-width: 0` on items.
  4. **`PostCard`.**
     - An `article` holding:
       - the cover, when present: `next/image` `fill`, `sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"`, `preload` on the first card only, inside a `position: relative; aspect-ratio: 16/9` box
       - `h2 > a href="/posts/{slug}"` with `overflow-wrap: anywhere`
       - excerpt, author, `<time dateTime={publishedAt}>`, "<n> min read"
       - when tags exist, `<ul aria-label="Tags">` with the first 3, plus `<li>+n more</li>`
     - `helpers.ts`: `formatPostDate(iso)` with `Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })`, and `visibleTags(tags)`.
  5. **`Pagination`.**
     - `<nav aria-label="Pagination">` holding:
       - "Previous" (a `span`, not a link, on page 1)
       - page items from `helpers.ts` `paginationItems(current, total)`: all numbers when total ≤ 7, else first, last, current ±1 and "…" per gap
       - the current page item with `aria-current="page"`
       - "Next" (not a link on the last page)
       - the text "Page N of M"
     - Link boxes are at least 2.75rem in each dimension.
  6. **`PostsSkeleton`.** `role="status"` text "Loading posts…" plus 6 placeholder cards sized like `PostCard`.
  7. **`not-found.tsx`.** `metadata.robots = { index: false }`, `h1` "Page not found", link "Go to the first page" → `/posts`.
- **Done when:** with the seeded DB, `curl -s localhost:3000/posts | grep -c '<article'` prints 12, `curl -I '/posts?page=6'` returns 404, and `curl -I '/posts?page=1'` returns 308 with `location: /posts`.
- **Tests:** see Test brief WP7.tests

### WP8 — Docs   [repo root · group F]
- **Implements:** R-26
- **Files:** modify `README.md`
- **Skills to apply:** engineering-paved-path:typescript-expert not applicable; no skill section governs this prose edit (group F, Markdown)
- **Constraints:** GT-5. Change only line 12's wording (A-17) and the Getting started block (`README.md:33-39`).
- **Steps:**
  1. Reword `README.md:12` per GT-5 and add `src/lib/api.ts` to the tree.
  2. In Getting started, add `pnpm --filter @blog/api db:seed  # dev data` after `db:migrate`, and a note to fill `API_BASE_URL`/`SITE_URL` in `.env`.
- **Done when:** `README.md` contains `db:seed`, and the line about `src/lib/hooks/` no longer says "the only callers of the API".
- **Tests:** see Test brief WP8.tests

## Implementation order
WP1 → WP2 → WP3 → WP4 → WP5 (API chain). WP1 → WP6 → WP7 (web chain; it needs WP1's contracts and, for the demo, WP4 and WP5). WP8 comes last.

If a gate is refused:
- **GT-1:** WP2, WP4 and WP5 cannot run. WP1, WP3, WP6 and WP7 can still land, and the page would show only the error state.
- **GT-3:** WP5's code lands but the `db:seed` command does not exist, so the WP5 `[T1]` tests stay red.
- **GT-6:** seeded cover URLs 404, the browser shows alt text (A-14), and AC-5 cannot be demoed.
- **GT-5:** WP8 is skipped.

## Acceptance criteria
**API**
- [ ] `GET /posts` with no query → 200, the body parses with `PostsListResponse`, `page` 1, `pageSize` 12 (R-14; AC-33)
- [ ] Draft rows and rows with `published_at` > `now()` never appear in `items`, and `totalItems` excludes them (R-15; AC-34)
- [ ] Items are ordered `publishedAt` desc, then `id` desc, the same on repeated calls (R-15; AC-35)
- [ ] `page=2&pageSize=5` over 50 listed posts → the 6th–10th newest, `totalItems` 50, `totalPages` 10 (R-15; AC-36)
- [ ] `page=99` over 50 posts → 200, `items: []`, `totalItems` 50, `totalPages` 5 (R-15; AC-37)
- [ ] `page` = `0`, `10001`, `a`, `1.5` or repeated, and `pageSize` = `0` or `51` → 400 `application/problem+json` with `errors[0].param` naming the parameter (R-16; AC-38)
- [ ] Item keys are exactly the 9 `PostSummary` keys (R-14; AC-39)
- [ ] `readingTimeMinutes` = max(1, ceil(words/200)) (R-17; AC-40)
- [ ] A row without a cover → `coverImage: null` (R-14; AC-41)
- [ ] A 200 response has `Cache-Control: public, max-age=60`; any 4xx or 5xx has `no-store` (R-18; AC-42, AC-43)
- [ ] DB unreachable → 503 problem, title "Service unavailable", with no SQL, stack or host in the body (R-19; AC-44)
- [ ] The API emits one log line per request with reqId, method, path, statusCode and durationMs, and a 5xx line with `err` (R-19; NFR-13)

**Database**
- [ ] Inserting a duplicate slug fails with SQLSTATE 23505 (R-20; AC-45)
- [ ] Inserting a published row with null `published_at` fails with 23514 (R-20; AC-46)
- [ ] Inserting only one of the cover URL and cover alt fails with 23514 (R-20; AC-47)
- [ ] The migration SQL defines `posts_published_list_idx (published_at DESC, id DESC) WHERE status = 'published'` (R-15; NFR-5)

**Seed**
- [ ] `db:seed` leaves 50 published past rows within 365 days, 1 draft and 1 row scheduled 30 days ahead (R-21; AC-48)
- [ ] The seeded set has at least 3 rows without cover, 1 title ≥ 150 chars, 1 title with a 40+ char unbroken word, 2 rows without tags, 1 row with 10 tags and 1 shared `publishedAt` (R-21; AC-49)
- [ ] A second `db:seed` run leaves the same slugs and row count (R-21; AC-50)
- [ ] `NODE_ENV=production db:seed` exits non-zero with a message and leaves the row count unchanged (R-21; AC-51)
- [ ] On an unmigrated DB, `db:seed` exits non-zero with a message containing `db:migrate` (R-21; AC-52)
- [ ] After the seed, `GET /posts` reports `totalItems` 50 and no page lists `seed-draft-post` or `seed-scheduled-post` (R-21; AC-53)

**Web: list and cards** (demo, A-22)
- [ ] JS off, `/posts` → 200 with 12 `article` elements (R-1; AC-1)
- [ ] Each card has an `h2 > a[href="/posts/{slug}"]`, the excerpt, the author, `time[datetime]` with "Mon D, YYYY" in UTC, and "<n> min read" (R-2; AC-2, AC-3, AC-4)
- [ ] A cover `img` has the stored alt, `srcset`, `sizes` and a 16:9 box; a card without a cover has no `img` (R-3; AC-5, AC-6)
- [ ] The 10-tag post shows 3 tags and "+7 more" in `ul[aria-label=Tags]`; a post without tags has no list (R-4; AC-7, AC-8)
- [ ] The 150+ char title is shown whole, the 40-char word wraps, and the `<b>HTML</b>` title shows the angle brackets with no `b` element (R-5; AC-9, AC-10)
- [ ] The grid shows 1, 2 and 3 columns at 375, 800 and 1280 px (R-6; AC-11)
- [ ] An emulated dark scheme switches the tokens (R-6; AC-12)

**Web: states**
- [ ] Empty table → 200, "No posts yet.", no `nav[aria-label=Pagination]` (R-7; AC-13)
- [ ] API stopped with an empty cache → "Posts couldn't be loaded.", a "Try again" link to the same path, and robots `noindex` (R-8; AC-14, AC-15)
- [ ] Load the page, stop the API, reload: the list is still shown (R-8; AC-16)
- [ ] API delayed 6 s → the error state appears after about 5 s, and the web server logs url, reason `timeout` and page (R-8; NFR-1, NFR-14)
- [ ] Throttled API, `/posts` → `role=status` "Loading posts…" and the placeholders render before the list (R-9; AC-17)

**Web: pagination**
- [ ] `/posts?page=5` → 200, 2 articles, "Page 5 of 5" (R-10; AC-18)
- [ ] The nav has Previous, 1–5, Next; on page 3, link "3" has `aria-current="page"`; on page 1 "Previous" is not an `a`; on page 5 "Next" is not an `a` (R-10; AC-19–AC-22)
- [ ] With 9 pages, page 5 shows "1 … 4 5 6 … 9" (R-10; AC-23)
- [ ] Following "Next" from the page bottom lands at the top of page 2 (R-11; AC-24)
- [ ] `/posts?page=6` → 404 with `noindex` and a "Go to the first page" link to `/posts` (R-12; AC-25)
- [ ] `/posts?page=` `0`, `-1`, `1.5`, `abc`, `01` and `page=2&page=3` each → 404 (R-12; AC-26)
- [ ] `/posts?page=1` → 308 to `/posts`, and `/` → 307 to `/posts` (R-12; AC-27, AC-54)

**Web: SEO**
- [ ] `link[rel=canonical]` = `SITE_URL` + `/posts?page=2` on page 2 with no `utm_*`, and `?page=2&utm_source=x` renders the same articles (R-13; AC-28, AC-29)
- [ ] The titles are "Posts | Blog" and "Posts – Page 2 of 5 | Blog"; the meta description is "Latest posts from Blog."; pages 1–5 carry no `noindex` (R-13; AC-30, AC-31, AC-32)

**Web: non-functional**
- [ ] The API request log shows 1 call for 5 reloads of one page within 60 s (R-22; NFR-2)
- [ ] A row with `published_at` = now + 60 s appears on `/posts` at most 120 s after that time (R-22; NFR-3)
- [ ] A production build under a Lighthouse mobile profile reports LCP ≤ 2.5 s and CLS ≤ 0.1 (R-23; NFR-4)
- [ ] The devtools network panel shows requests to the web origin only (R-24; NFR-6)
- [ ] The token contrast is ≥ 4.5:1 for text and ≥ 3:1 for UI and focus in both schemes (R-6; NFR-7)
- [ ] The Tab walk reaches "Skip to content" first and then follows visual order with visible focus, at one stop per card (R-11, R-2; NFR-8, NFR-10)
- [ ] The page exposes one `header`, one `main`, one `h1` and an `h2` per article (R-1; NFR-9)
- [ ] Pagination link boxes are at least 24×24 px (R-10; NFR-11)
- [ ] At 320 px there is no horizontal scrollbar (R-6; NFR-12)

**Env and docs**
- [ ] The web server with `SITE_URL` unset stops at start or build with a message naming `SITE_URL` (R-25)
- [ ] `README.md:12` no longer says the hooks are the only callers of the API (R-26)

## Test plan
| Area | Command | Needs (service / Docker / browser / keys) | Covers |
|---|---|---|---|
| all | `pnpm -r typecheck` (`package.json:12`) | none | contracts, api (incl. `test/`), web (`next typegen`) |
| api unit | `pnpm --filter @blog/api exec vitest run --exclude 'test/**/*.it.test.ts'` | none, and must not need Postgres | WP1, WP4 helpers, WP3 config, WP5 generator |
| api it | `pnpm db:up && pnpm --filter @blog/api exec vitest run --no-file-parallelism .it.test` | Docker Postgres (`docker-compose.yml`), `TEST_DATABASE_URL` in the root `.env` (GT-4) | WP2, WP4, WP5 |
| api all | `pnpm --filter @blog/api test` (`apps/api/package.json:10`) | as api it | everything above |
| web build | `pnpm --filter @blog/web build` (`apps/web/package.json:8`) | `SITE_URL`, `API_BASE_URL` in the root `.env` | WP6, WP7 compile and prerender |
| lint | none: the repo has no linter or CI workflow | — | — |
| demo | TP-3 | Docker, a browser, Lighthouse | web ACs, NFR-1–4, NFR-6–12, NFR-14 |

No suite makes paid calls or uses real credentials.

## Docs to update
- `README.md` — the A-17 wording at line 12, `src/lib/api.ts` in the tree, and the `db:seed` and env steps in Getting started (GT-5, WP8).
- `.env.example` — new keys with comments (GT-4, WP3).

## Recommendations (not in the plan until you accept them)
- **REC-1 Reword `README.md:27`.** New wording: "Inside `src/modules/`, only `routes.ts` imports fastify; `src/app.ts`/`src/server.ts` (composition) also do. Only repositories and `src/db/**` import drizzle-orm."
  - Why: the literal rule is broken by any bootstrap and by the schema and seed files (R-28; `onion-architecture` §1, §7). Without the change, architecture-reviewer will flag `app.ts` and `db/**`.
  - Cost: 2 lines.
  - If accepted: WP8 edits line 27 too, and GT-5 covers it.
- **REC-2 Seed size override for the AC-23 demo.** Add an optional `SEED_PUBLISHED_COUNT` (default 50).
  - Why: AC-23 needs at least 97 listed posts, but A-16 fixes the seed at 50, so that demo currently needs hand-inserted rows (TP-3).
  - Cost: about 10 lines, plus one env key and an A-16 change in the spec.
  - If accepted: WP5 and `.env.example` change, and one T2 test is added.
- **REC-3 Add a CI workflow.** Run typecheck, api unit and api it with a Postgres 18 service.
  - Why: the repo has no `.github/workflows`, so `tsc` and vitest are the only layering checks (`onion-architecture` §13) and nothing runs them on push.
  - Cost: one new workflow file, outside this spec.
  - If accepted: a new WP9 (CI files are security-group).

## Execution mode
- **Recommended:** multi-agent. The deciding facts:
  - 3 areas and 8 work packages.
  - A new shared contract and the first DB migration.
  - Security-group files: env config, query parsing, error translation, data-driven `href`/`src`.
  - Independent T1 tests are valuable for the API's 6 acceptance tests and the seed CLI.
- **Multi-agent split:**
  1. test-writer T1 (TP-1 infrastructure + WP4/WP5 `[T1]`)
  2. implementer #1: WP1 → WP2 → WP3 → WP4 → WP5 → WP8 (contracts + api + docs). In parallel after WP1 lands, implementer #2: WP6 → WP7 (web; reads `packages/contracts` only, shares no file with #1).
  3. test-writer T2
  4. plan-verifier ∥ architecture-reviewer
  5. at most 2 fix rounds
  6. engineering-insights
  7. The web demo (TP-3) is run by you after the agents finish.
- **Single-agent:** the main session does the following, in order:
  1. Write the TP-1 helpers and the `[T1]` tests and see them red.
  2. Implement WP1–WP8.
  3. See the T1 tests green.
  4. Write the `[T2]` tests.
  5. Run the Test plan and walk TP-3.

  This gives up independent test oracles: the same model writes the API and its tests. It also gives up independent verification unless you ask for reviewers.

## Risks & open questions
- **404 status on `?page=N≥2` (AC-25).** It depends on nothing streaming before the page throws `notFound()`: no `loading.tsx`, no Suspense above the page, and metadata streaming not flushing the shell early (Assumption from `next-best-practices` `error-handling.md` and `metadata.md` › Streaming). Settle it with `curl -I '/posts?page=6'` in TP-3. If it fails, move the range check into `proxy.ts`.
- **`instrumentation.ts` stopping `next start` (R-25).** It may log and continue instead of stopping (Assumption). Settle it by starting with `SITE_URL` unset. Either way `next build` fails, because the layout reads it.
- **TypeScript resolution of `@blog/contracts/*`.** Resolving the exports to `.ts` sources under NodeNext (`packages/contracts/package.json:6-8`, `tsconfig.base.json:5-6`) is untested; this is the first import. If `tsc` rejects it, the implementer stops and reports; a tsconfig change is then needed.
- **`application/problem+json` serialisation.** Fastify is assumed to serialise objects sent with this content type as JSON (Assumption). The WP4 T2 tests assert the header and a parsed body.
- **Generating covers with `sharp`.** It resolves `sharp` from Next's transitive install (`node_modules/.pnpm/sharp@0.35.5_*`), which pnpm does not expose to `apps/web`. If that path import fails, fall back to GT-6 (b).
- **Per-process web cache.** NFR-2 and AC-16 hold per process. A multi-instance deploy multiplies API calls (Assumption: a single `next start`). A stale entry triggers a blocking refetch, so a slow API delays the page up to 5 s even when a stale copy exists.
- **Shared test database.** Integration test files share `blog_test`, so they must run without file parallelism and truncate `posts` per file. The helper must refuse to run when `TEST_DATABASE_URL` equals `DATABASE_URL`.

<!-- test-brief -->
## Test brief
### TP-1 (test infrastructure, written by test-writer in T1)
**Helper `apps/api/test/helpers/db.ts`:**
- Load the root `.env` with `process.loadEnvFile` if it exists (pattern of `apps/api/drizzle.config.ts:4-6`).
- Require `TEST_DATABASE_URL`, and fail with a message if it is missing or equals `DATABASE_URL`.
- Create the database if it is missing by connecting to the `postgres` DB on the same server.
- Apply migrations with `migrate()` from `drizzle-orm/node-postgres/migrator` on `apps/api/drizzle`.
- Expose `truncatePosts()` and `insertPost(row)` over raw `pg`, using the column names in § Contract.

**Helper `apps/api/test/helpers/app.ts`:**
- Dynamically import `../../src/app.js` inside a try, assert the module exports a `buildApp` function, and return `buildApp(loadConfig({ ...process.env, DATABASE_URL: TEST_DATABASE_URL }), { logger: false })`.
- On today's tree, `[T1]` tests therefore fail on that assertion, not on an import crash.

**Rules for both suites:**
- Unit tests import neither helper.
- Integration tests run with `--no-file-parallelism`.

### TP-3 (demo, run by the user; web rows are `demo` per spec A-22)
1. `pnpm db:up`
2. `pnpm --filter @blog/api db:migrate`
3. `pnpm --filter @blog/api db:seed`
4. `pnpm dev`
5. Walk the Web acceptance criteria in a browser with devtools, and with `curl -I` for statuses.

Specific checks:
- **AC-16:** reload after `Ctrl-C` on the API.
- **AC-17/NFR-1:** put a delay in front of the API.
- **AC-23:** insert 50 extra published rows with SQL first.
- **NFR-4:** use `pnpm --filter @blog/web build && pnpm --filter @blog/web start` with Lighthouse mobile.

### WP1.tests
- [T2] Given `PostsListQuery` When parsing `{}` Then `{ page: 1, pageSize: 12 }`; `{ page: '01' }` → `page` 1; `{ page: '1e3' }`, `{ page: '1.5' }`, `{ page: ['1','2'] }`, `{ pageSize: '51' }` each fail with issue path `['page']` or `['pageSize']`; `{ foo: 'x' }` → the output has no `foo` → `apps/api/test/contracts.test.ts` · api unit
- [T2] Given `PostSummary` When `coverImage.url` is `https://x.test/a.webp` or `//x/a.webp` Then the parse fails; `/covers/cover-1.webp` passes; slug `Bad Slug` fails; `publishedAt` `2026-10-20T10:00:00+02:00` fails; `readingTimeMinutes` 0 fails → `apps/api/test/contracts.test.ts` · api unit
- [T2] Given `ProblemDetails` When `errors` is omitted Then the parse passes → `apps/api/test/contracts.test.ts` · api unit

### WP2.tests
- [T2] Given a row with slug `dup` When a second row with slug `dup` is inserted Then the insert fails with SQLSTATE `23505` → `apps/api/test/posts-schema.it.test.ts` · api it (spec AC-45)
- [T2] Given status `published` and `published_at` null When inserted Then it fails with `23514` → same file · api it (spec AC-46)
- [T2] Given `cover_image_url` set and `cover_image_alt` null (and the reverse) When inserted Then each fails with `23514` → same file · api it (spec AC-47)
- [T2] Given a draft row with `published_at` null When inserted Then it succeeds and `id` is a version-7 UUID → same file · api it
- [T2] Given the generated migration SQL When read as text Then it contains `posts_published_list_idx` with `"published_at" DESC`, `"id" DESC` and `WHERE` on status `'published'` → `apps/api/test/migration.test.ts` · api unit (spec NFR-5, inspection aid)

### WP3.tests
- [T2] Given `loadConfig({})` Then it throws, and the message contains `DATABASE_URL` → `apps/api/test/config.test.ts` · api unit
- [T2] Given `loadConfig({ DATABASE_URL: 'postgres://u:p@h:5432/d', API_PORT: 'abc' })` Then it throws with a message containing `API_PORT`; with only `DATABASE_URL` → `port` 3001, `host` `127.0.0.1`, `nodeEnv` `development` → same file · api unit
- [T2] Given the app When `GET /nope` Then 404, `content-type` starts with `application/problem+json`, `cache-control` `no-store`, `body.title` `Not found` → `apps/api/test/app.it.test.ts` · api it

### WP4.tests
- [T1] Given 13 published rows dated in the past When `GET /posts` Then 200, the body parses with `PostsListResponse`, `page` 1, `pageSize` 12, `items.length` 12, `totalItems` 13, `totalPages` 2 → `apps/api/test/posts-list.it.test.ts` · api it (spec AC-33)
- [T1] Given 3 published past rows, 1 draft and 1 published row with `published_at = now() + interval '1 day'` When `GET /posts?pageSize=50` Then the item slugs are exactly the 3 past published slugs and `totalItems` is 3 → same file · api it (spec AC-34)
- [T1] Given rows A and B with identical `published_at`, where B's id sorts above A's, plus a newer row C When `GET /posts` twice Then both responses list C, B, A in that order → same file · api it (spec AC-35)
- [T1] Given 50 published rows with distinct `published_at` When `GET /posts?page=2&pageSize=5` Then the items are the 6th–10th newest slugs, `totalItems` 50, `totalPages` 10 → same file · api it (spec AC-36)
- [T1] Given one row with every column set (including `body` and `status`) When `GET /posts` Then `Object.keys(items[0]).sort()` equals `["authorName","coverImage","excerpt","id","publishedAt","readingTimeMinutes","slug","tags","title"]` → same file · api it (spec AC-39)
- [T1] Given any rows When `GET /posts` returns 200 Then header `cache-control` = `public, max-age=60` → same file · api it (spec AC-42)
- [T2] Given 50 published rows When `GET /posts?page=99` Then 200, `items` `[]`, `totalItems` 50, `totalPages` 5 → same file · api it (spec AC-37)
- [T2] When `GET /posts` with each of `page=0`, `page=10001`, `page=a`, `page=1.5`, `page=1&page=2`, `pageSize=0`, `pageSize=51` Then 400, `content-type` starts with `application/problem+json`, `body.status` 400, `body.title` `Bad request`, and `body.errors[0].param` is `page` or `pageSize` as sent → `apps/api/test/posts-validation.it.test.ts` · api it (spec AC-38)
- [T2] Given a 400 response Then `cache-control` = `no-store` → same file · api it (spec AC-43)
- [T2] When `GET /posts?foo=bar` Then 200 with the same body as `GET /posts` → same file · api it
- [T2] Given a row with null cover columns and one with both set When `GET /posts` Then those items have `coverImage` `null` and `{ url, alt }` respectively → `posts-list.it.test.ts` · api it (spec AC-41)
- [T2] Given `buildApp` with `DATABASE_URL=postgres://blog:blog@127.0.0.1:1/blog` When `GET /posts` Then, within 5 s, 503, `body.title` `Service unavailable`, `cache-control` `no-store`, and the raw body contains none of `select`, `posts`, `ECONNREFUSED`, `127.0.0.1`, `    at ` → `apps/api/test/posts-unavailable.it.test.ts` · api it (spec AC-44)
- [T2] Given a stored instant `2026-10-20T08:00:00.123Z` When listed Then `publishedAt` is exactly that string → `posts-list.it.test.ts` · api it
- [T2] Given `readingTimeMinutes` When the body is `''`, `'word'`, 200 words, 201 words or `'  a\n\tb  '` Then 1, 1, 1, 2, 1 → `apps/api/test/posts-helpers.test.ts` · api unit (spec AC-40)

### WP5.tests
- [T1] Given a migrated `blog_test` with `posts` truncated When `pnpm --filter @blog/api db:seed` runs as a child process with `DATABASE_URL=$TEST_DATABASE_URL` Then the exit code is 0, and SQL shows 50 rows `status='published' AND published_at <= now() AND published_at > now() - interval '365 days'`, 1 row `status='draft'`, and 1 row `status='published' AND published_at BETWEEN now() + interval '29 days' AND now() + interval '31 days'` → `apps/api/test/seed.it.test.ts` · api it (spec AC-48)
- [T1] Given the seeded table Then:
  - at least 3 rows have null `cover_image_url`
  - at least 1 row has `char_length(title) >= 150`
  - at least 1 row has `title ~ '\S{40,}'`
  - at least 2 rows have `cardinality(tags) = 0`
  - at least 1 row has `cardinality(tags) = 10`
  - at least 1 `published_at` value is shared by 2 published rows

  → same file · api it (spec AC-49)
- [T1] Given one seed run When `db:seed` runs again Then the slug set is identical and the row count is 52 both times → same file · api it (spec AC-50)
- [T1] Given the seeded table When `GET /posts?pageSize=50` through the app helper Then `totalItems` 50 and no item has slug `seed-draft-post` or `seed-scheduled-post` → same file · api it (spec AC-53)
- [T2] Given env `NODE_ENV=production` When `db:seed` runs Then the exit code ≠ 0, stderr contains `production`, and the row count is unchanged → same file · api it (spec AC-51)
- [T2] Given a freshly created, unmigrated database `blog_test_unmigrated` (dropped after) When `db:seed` runs against it Then the exit code ≠ 0 and stderr contains `db:migrate` → same file · api it (spec AC-52)
- [T2] Given a non-seed row with slug `keep-me` When `db:seed` runs Then `keep-me` still exists unchanged → same file · api it (spec A-16)
- [T2] Given `generateSeedPosts(new Date('2026-10-20T12:00:00Z'))` called twice Then the results are deep-equal, there are 52 rows, slugs are unique and match `^[a-z0-9]+(-[a-z0-9]+)*$`, every published-past row maps to a `PostSummary`-valid shape, and one title contains `<b>HTML</b>` → `apps/api/test/seed-generate.test.ts` · api unit

### WP6.tests
- none — the web app has no test suite (spec A-22). Verified by TP-3 against AC-14, AC-15, AC-16, AC-54, NFR-1, NFR-2, NFR-3, NFR-6, NFR-7, NFR-8, NFR-14 and R-25.

### WP7.tests
- none — the web app has no test suite (spec A-22). Verified by TP-3 against AC-1–AC-13, AC-17–AC-32, NFR-4, NFR-9–NFR-12.

### WP8.tests
- none — a docs change; plan-verifier checks the WP8 "Done when" by inspection.
