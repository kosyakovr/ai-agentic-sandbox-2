# Posts list

**Status:** approved (user · 2026-10-20)
**Ticket:** none
**Areas:** apps/web, apps/api, packages/contracts, root env template

## Goal
Readers have no way to see what the blog has published: the monorepo is an empty skeleton (S-5). This feature gives
them a public, server-rendered, responsive page listing published posts newest first, split into numbered pages, and
the public API endpoint that serves those pages (S-1, S-2). It also gives developers a seeded dev database that
exercises every list state, so the page can be built and reviewed against realistic data (S-2).

## Non-goals
- The post detail page `/posts/{slug}` — a later spec; this one only stores the body for it (S-2). Card links point at it and 404 until it ships (AC-2, A-24, S-7).
- A home page at `/` — `/` only redirects to the list until one exists (AC-54, S-7).
- Deferred proposals P-1–P-5 (S-7): RSS feed and sitemap, a web test suite, focus move after a page change, API rate limiting, ETag/`Link` headers.
- Writing posts: no create/edit/delete API, no admin UI, no authentication (S-1: no auth exists).
- Tag pages, tag filtering, search, alternative sort orders (inferred: "simple, typical blog").
- An authors entity or author pages — the author is a plain name on the post (S-2).
- Infinite scroll, "load more", cursor pagination (S-2 chose page numbers).
- Remote image hosts, a CDN, image upload (A-14).
- `rel="prev"`/`rel="next"` `<link>` tags in the document head (A-10).
- A manual light/dark toggle (A-23; now specified in `docs/specs/theme-toggle.md`); i18n — English only (A-6); analytics, comments, view counts (inferred).

## Sources
| ID | Source | What it contributes |
|---|---|---|
| S-1 | request — user text, 2026-10-20 | posts list page + API endpoint; simple responsive UI; 2026 best practices; the coverage list (data, contract, UX states, SEO, a11y, caching, security) |
| S-2 | request — user decisions 1–4, 2026-10-20 | "typical" fields; page-number pagination with `?page=N`, totals, stable order; generated dev seed incl. draft + future post; CSS Modules + global tokens, light/dark, mobile-first |
| S-3 | existing — `README.md:1-29` | site name "Blog"; route/lib/hooks rules (`README.md:8-12`); onion layering (`README.md:15-18,27`); contracts imported per file, zod only (`README.md:22-23,29`) |
| S-4 | existing — `apps/api/package.json:6-30`, `apps/web/package.json:6-22` | Fastify 5, zod type provider, Drizzle, pino-pretty, vitest suites in api; web has no test script; no seed script |
| S-5 | existing — `apps/api/drizzle/meta/_journal.json:1`, `docker-compose.yml:5`, `.env.example:1-6` | no migrations or tables yet; Postgres 18; no API URL or site URL setting |
| S-6 | existing — `apps/web/next.config.ts:4-5` | contracts transpiled into web; typed routes on |
| S-7 | request — user answers to open questions, 2026-10-20 | list at `/posts`, `/` → 307 `/posts`; card links to `/posts/{slug}` (404 until post page); P-1–P-5 deferred; web checks stay `demo` |

## User stories
### US-1 — Browse the latest posts (P1)
As a reader, I want to open the blog's posts page and see the newest published posts as cards, so that I can pick one to read.
**Independent test:** with seed data, open `/posts` with JavaScript disabled; 12 cards appear newest first, with no draft or future post.

### US-2 — Page through older posts (P1)
As a reader (or a search crawler), I want numbered pages with shareable `?page=N` URLs, so that I can reach any older post.
**Independent test:** with seed data, follow "Next" to `/posts?page=5`; it shows 2 posts, "Page 5 of 5", and `/posts?page=6` is a 404.

### US-3 — List posts over the API (P2)
As the web app (or any HTTP client), I want `GET /posts` to return one page of post summaries with totals, so that I can render a page without knowing the storage.
**Independent test:** `GET /posts?page=2&pageSize=5` on the seeded DB returns 5 items, `totalItems: 50`, `totalPages: 10`.

### US-4 — Seed the dev database (P2)
As a developer, I want one command that fills the dev DB with realistic, edge-case posts, so that every list state can be seen locally.
**Independent test:** run the seed twice on a migrated DB; `GET /posts` reports `totalItems: 50` both times.

## Contract
- **Routes / APIs:** `GET /posts` on the API (A-3). Query: `page` integer 1–10000, default 1 (A-2); `pageSize` integer
  1–50, default 12 (A-1); other parameters ignored. `200 application/json` → `PostsListResponse`:
  `{ items: PostSummary[], page, pageSize, totalItems, totalPages }`, `totalPages = ceil(totalItems / pageSize)` (0 when empty).
  `PostSummary = { id: uuid, slug, title, excerpt, authorName, tags: string[], publishedAt: ISO-8601 UTC string,
  readingTimeMinutes: integer ≥ 1, coverImage: { url, alt } | null }`. Errors `400 | 500 | 503 application/problem+json`
  (RFC 9457): `{ type, title, status, detail, errors?: [{ param, message }] }`. Headers per AC-42, AC-43.
- **Shared schemas:** new `@blog/contracts/posts` — `PostsListQuery`, `PostSummary`, `PostsListResponse`; new
  `@blog/contracts/errors` — `ProblemDetails`. One copy each: the API validates input and serialises output with them, the
  web app (which already consumes contracts, S-6) parses the API response with them; no hand-written duplicate type in either app. Field bounds: A-4.
- **Tools / commands:** `pnpm --filter @blog/api db:seed` — dev seed (AC-48–AC-53). New settings in the root env template (S-5): the API
  base URL the web server calls and the public site URL used for canonical links (A-18); neither reaches the browser.
- **UI surface:** the list at `/posts` and `/posts?page=N`; `/` redirects to `/posts` with 307 until a home page exists (user · 2026-10-20, S-7; AC-54);
  site chrome: "Skip to content" link, header with the site name "Blog" linking to the list, `main`; post card; pagination
  nav; loading, empty and error states; not-found page for out-of-range pages.
- **Persistence:** posts — id, slug (unique), title, excerpt, body (Markdown, A-5), author name, ordered tags, cover image
  URL + alt (both or neither), status `draft | published`, publishedAt (required when published; a future value means
  scheduled), created/updated timestamps. A new table is the
  project's first migration — **user gate** (S-5). The list and count must be index-served (NFR-5).

### Module interaction
```mermaid
sequenceDiagram
  participant B as Browser
  participant W as Web app (server)
  participant A as API
  participant D as Postgres
  B->>W: GET /posts?page=N
  Note over W: N not canonical → 404 (AC-26); N = 1 → 308 /posts (AC-27)
  W->>A: GET /posts?page=N&pageSize=12 (cached ≤ 60 s, timeout 5 s)
  Note over A: invalid query → 400 problem (AC-38)
  A->>D: count + page of published, publishedAt ≤ now()
  D-->>A: rows / failure → 503 problem (AC-44)
  A-->>W: 200 PostsListResponse
  Note over W: fails contract / non-2xx / timeout → error state (AC-14), stale copy if cached (AC-16)
  W-->>B: HTML 200, or 404 when N > totalPages (AC-25)
```

## Acceptance criteria
**List page (US-1)**
- **AC-1** (US-1 · S-1) WHEN a visitor requests `/posts`, the web app SHALL respond 200 with server-rendered HTML holding one `article` per post of page 1, readable with JavaScript disabled.
- **AC-2** (US-1 · S-2, S-7, A-24) Each card SHALL show the title as an `h2` link to `/posts/{slug}`, the excerpt, the author name, the date and the reading time.
- **AC-3** (US-1 · A-6) The card SHALL render the date as `<time datetime="<ISO-8601>">` with text in the form "Oct 20, 2026", computed in UTC.
- **AC-4** (US-1 · A-5) The card SHALL render the reading time as "<n> min read".
- **AC-5** (US-1 · S-2, A-11, A-14) WHERE a post has a cover image, the card SHALL render it in a 16:9 box with the stored alt text, a `srcset` and a `sizes` attribute matching the A-11 columns.
- **AC-6** (US-1 · S-2) IF a post has no cover image, THEN the card SHALL render no image and no placeholder.
- **AC-7** (US-1 · A-15) WHERE a post has tags, the card SHALL show the first 3 as plain text in a list labelled "Tags", followed by "+<n> more" when there are more than 3.
- **AC-8** (US-1 · S-2) IF a post has no tags, THEN the card SHALL render no tag list.
- **AC-9** (US-1 · S-2) The card SHALL show the full title without truncation, wrapping a word longer than the card width.
- **AC-10** (US-1 · S-1) IF a title, excerpt, author name or tag contains HTML markup, THEN the page SHALL show it as literal text and create no element from it.
- **AC-11** (US-1 · A-11) The list SHALL show 1 column below 640 CSS px, 2 columns from 640 px and 3 columns from 1024 px viewport width.
- **AC-12** (US-1 · S-2, A-23) WHEN the operating system prefers a dark colour scheme, the page SHALL render with the dark token set.
- **AC-13** (US-1 · S-1) WHEN no post is listed, `/posts` SHALL respond 200 with the `h1` "Posts", the text "No posts yet." and no pagination nav.
- **AC-14** (US-1 · S-1) IF the API is unreachable, responds non-2xx, times out (NFR-1) or returns a body that fails the contract, THEN the page SHALL render "Posts couldn't be loaded." and a "Try again" link to the current URL.
- **AC-15** (US-1 · A-10) WHILE the error state is shown, the page SHALL carry `<meta name="robots" content="noindex">`.
- **AC-16** (US-1 · A-7) IF the API fails while a successfully rendered copy of the requested page is cached, THEN the web app SHALL serve that copy instead of the error state.
- **AC-17** — removed (user · 2026-10-21): it conflicted with AC-1 (readable with JavaScript disabled), because a streamed loading state hides the server-rendered posts until JavaScript runs. Every list page now renders its posts in the initial HTML; no loading placeholder.

**Pagination and SEO (US-2)**
- **AC-18** (US-2 · S-2) WHEN `/posts?page=N` is requested with 2 ≤ N ≤ totalPages, the web app SHALL respond 200 with page N's posts and the visible text "Page N of M".
- **AC-19** (US-2 · S-2) WHEN totalPages > 1, the page SHALL render a `nav` labelled "Pagination" holding "Previous", page-number links and "Next".
- **AC-20** (US-2 · S-1) The current page's number link SHALL carry `aria-current="page"`.
- **AC-21** (US-2 · S-2) WHILE on page 1, the "Previous" item SHALL NOT be a link.
- **AC-22** (US-2 · S-2) WHILE on the last page, the "Next" item SHALL NOT be a link.
- **AC-23** (US-2 · A-12) WHEN totalPages > 7, the nav SHALL link the first page, the last page and the current page ±1, showing "…" for each gap.
- **AC-24** (US-2 · S-2) WHEN a pagination link is followed, the page SHALL show the target page scrolled to its top.
- **AC-25** (US-2 · A-9) IF N > totalPages and N ≥ 2, THEN the web app SHALL respond 404 with a not-found page carrying `noindex` and a "Go to the first page" link to `/posts`.
- **AC-26** (US-2 · A-9) IF `page` is not a decimal integer ≥ 1 without leading zeros, or appears more than once, THEN the web app SHALL respond 404 with the AC-25 page.
- **AC-27** (US-2 · A-9) WHEN `/posts?page=1` is requested, the web app SHALL redirect with 308 to `/posts`.
- **AC-54** (US-2 · S-7) WHEN `/` is requested, the web app SHALL redirect with 307 to `/posts`.
- **AC-28** (US-2 · A-10) The page SHALL carry a canonical link to its own absolute URL — `/posts` for page 1, `/posts?page=N` otherwise — without any other query parameter.
- **AC-29** (US-2 · A-10) WHEN query parameters other than `page` are present, the web app SHALL render the same content as without them.
- **AC-30** (US-2 · A-6) The document title SHALL be "Posts | Blog" on page 1 and "Posts – Page N of M | Blog" on page N ≥ 2.
- **AC-31** (US-2 · A-6) Every list page SHALL carry the meta description "Latest posts from Blog."
- **AC-32** (US-2 · A-10) WHEN a list page responds 200 with posts, it SHALL carry no `noindex`.

**API (US-3)**
- **AC-33** (US-3 · S-1, A-1) WHEN `GET /posts` is sent with no query, the API SHALL respond 200 with a body valid against `PostsListResponse`, `page: 1` and `pageSize: 12`.
- **AC-34** (US-3 · S-2) The API SHALL list only posts whose status is `published` and whose publishedAt ≤ the database's current time.
- **AC-35** (US-3 · S-2, A-21) The API SHALL order items by publishedAt descending, then by id descending.
- **AC-36** (US-3 · S-2) WHEN `page=N&pageSize=M` is valid, the API SHALL return the listed posts at positions (N−1)·M+1 to N·M with `totalItems` = all listed posts and `totalPages` = ceil(totalItems / M).
- **AC-37** (US-3 · S-2) IF N > totalPages, THEN the API SHALL respond 200 with `items: []` and the real `totalItems` and `totalPages`.
- **AC-38** (US-3 · A-2, A-3) IF `page` or `pageSize` is not an integer in its range or is repeated, THEN the API SHALL respond 400 `application/problem+json` whose `errors[].param` names it.
- **AC-39** (US-3 · S-2) Each item SHALL hold exactly the `PostSummary` fields and never `body`, `status` or created/updated timestamps.
- **AC-40** (US-3 · A-5) The API SHALL set `readingTimeMinutes` to max(1, ceil(words in body / 200)).
- **AC-41** (US-3 · S-2) IF a post has no cover image, THEN the API SHALL return `coverImage: null`.
- **AC-42** (US-3 · A-7) WHEN the API responds 200, it SHALL send `Cache-Control: public, max-age=60`.
- **AC-43** (US-3 · A-7) IF the API responds with a 4xx or 5xx status, THEN it SHALL send `Cache-Control: no-store`.
- **AC-44** (US-3 · A-3) IF the database is unreachable or the query fails, THEN the API SHALL respond 503 problem with title "Service unavailable" and no SQL, stack trace or connection detail.
- **AC-45** (US-3 · S-2) IF a post is stored with a slug that already exists, THEN the database SHALL reject the write.
- **AC-46** (US-3 · S-2) IF a post is stored as `published` without publishedAt, THEN the database SHALL reject the write.
- **AC-47** (US-3 · A-4) IF a post is stored with only one of cover URL and cover alt, THEN the database SHALL reject the write.

**Seed (US-4)**
- **AC-48** (US-4 · S-2, A-16) WHEN `db:seed` runs on a migrated dev database, it SHALL leave 50 published posts dated within the past 365 days, 1 draft and 1 post scheduled 30 days ahead.
- **AC-49** (US-4 · S-2, A-16) The seeded set SHALL include ≥ 3 posts without cover, ≥ 1 title of ≥ 150 characters, ≥ 1 title with an unbroken word of ≥ 40 characters, ≥ 2 posts without tags, ≥ 1 with 10 tags and ≥ 1 pair sharing a publishedAt.
- **AC-50** (US-4 · A-16) WHEN `db:seed` runs a second time, it SHALL leave the same slugs and the same row count.
- **AC-51** (US-4 · A-16) IF `NODE_ENV` is `production`, THEN `db:seed` SHALL exit non-zero with a message and write nothing.
- **AC-52** (US-4 · S-5) IF the posts table does not exist, THEN `db:seed` SHALL exit non-zero with a message naming `db:migrate`.
- **AC-53** (US-4 · S-2) WHEN the seed has run, the API SHALL report `totalItems: 50` and no page SHALL list the draft or the scheduled slug.

### Must keep working
none — the skeleton has no behaviour yet (S-5).

## States and edge cases
| Surface | Default | Loading | Empty | Error | Partial / degraded | No access | Stale / expired |
|---|---|---|---|---|---|---|---|
| `/posts` page | AC-1, AC-18 | n/a (AC-17 removed) | AC-13 | AC-14, AC-15 | AC-16 (cached copy) | n/a — public (A-19) | NFR-3 |
| Post card | AC-2–AC-5 | n/a — server-rendered | AC-6, AC-8 | broken image → alt text only (A-14) | AC-7, AC-9 | n/a | n/a |
| Pagination nav | AC-19–AC-22 | n/a | AC-13 (hidden ≤ 1 page) | AC-25, AC-26 | AC-23 (many pages) | n/a | AC-25 (page vanished) |
| `GET /posts` | AC-33, AC-36 | n/a | AC-37 | AC-38, AC-44 | n/a | AC-34, AC-39 (no draft leak) | AC-42 |
| `db:seed` | AC-48, AC-49 | n/a | n/a | AC-51, AC-52 | n/a | n/a | AC-50 (re-run) |

Other edge cases: two posts with one publishedAt → AC-35; markup in text → AC-10; `?page=01`, `0`, `-1`, `1.5`, `abc`,
repeated → AC-26, AC-38; huge `page` → AC-38 (A-2); a post published between two page views shifts items (A-20).

## Non-functional
- **NFR-1** (time budget · A-8) WHEN the web app calls the API, it SHALL abandon the call after 5 s and render the AC-14 error state.
- **NFR-2** (external calls · A-7) WHEN one list page is requested repeatedly within 60 s, the web app SHALL make at most 1 API call for it.
- **NFR-3** (freshness · A-7) WHEN a post's publishedAt passes, the post SHALL appear on `/posts` within 120 s without a deploy.
- **NFR-4** (performance · A-13) WHEN `/posts` loads from a production build with seed data under a mobile Lighthouse profile, LCP SHALL be ≤ 2.5 s and CLS ≤ 0.1.
- **NFR-5** (performance · S-2) The list and count queries SHALL be served by an index matching the visibility filter and the AC-35 order.
- **NFR-6** (privacy · A-14, A-18) WHEN `/posts` loads, the browser SHALL send no request to the API origin or to any third-party origin.
- **NFR-7** (accessibility · A-13) In both colour schemes, text SHALL have contrast ≥ 4.5:1 and focus indicators and UI boundaries ≥ 3:1.
- **NFR-8** (accessibility · A-13) WHEN a keyboard user tabs from page load, focus SHALL reach "Skip to content" first, then follow visual order with a visible focus indicator.
- **NFR-9** (accessibility · A-13) The page SHALL expose one `header`, one `main`, one `h1`, an `article` with an `h2` per card, and no skipped heading level.
- **NFR-10** (accessibility · A-13) Each card SHALL add at most one stop to the Tab order.
- **NFR-11** (accessibility · A-13) Each pagination link SHALL have a target ≥ 24×24 CSS px.
- **NFR-12** (accessibility · A-13) At a 320 CSS px viewport, the page SHALL need no horizontal scrolling and clip no text.
- **NFR-13** (observability · S-4) The API SHALL log every request with request id, method, path, status and duration, and every 5xx with its error.
- **NFR-14** (observability · A-8) IF the web app's API call fails, THEN it SHALL log server-side the URL, the status or timeout and the page number.

## Assumptions
- **A-1** Page size 12 on the web; API `pageSize` default 12, max 50 — 12 fills 1, 2 or 3 columns evenly; 50 bounds one response.
- **A-2** API `page` max 10000; above → 400 — bounds offset arithmetic and deep-offset abuse; far beyond any blog's size.
- **A-3** Route `GET /posts` with no version prefix; errors as RFC 9457 problem details — the first endpoint sets the convention.
- **A-4** Bounds: title 1–200 chars, slug 1–100 lowercase kebab-case, excerpt 1–300, author name 1–100, 0–10 tags of 1–32 lowercase chars, cover alt 0–200 (empty = decorative).
- **A-5** Body is Markdown; words = whitespace-separated tokens; 200 words per minute, min 1 — a common blog reading rate.
- **A-6** English only, dates "Oct 20, 2026" in UTC (no server/client timezone drift), site name "Blog" (S-3); title and description texts as in AC-30, AC-31.
- **A-7** Freshness window 60 s per layer (API `max-age`, web reuse of API data), so ≤ 120 s end to end; a cached copy outlives an API failure.
- **A-8** The web server gives the API 5 s per call; failures are logged server-side only.
- **A-9** Beyond-range or malformed `page` → 404, not a redirect or an empty 200: a 200 empty page is a soft 404 to crawlers, a redirect hides the error; `?page=1` → 308 keeps one URL per page.
- **A-10** Every list page is indexable and self-canonical; no `rel=prev/next` head links (search engines no longer use them; the nav links are crawlable); error and 404 pages are `noindex`.
- **A-11** Breakpoints 640 / 1024 CSS px, content max width 1200 px, cover ratio 16:9.
- **A-12** More than 7 pages → first, last, current ±1 and "…"; 7 or fewer → all numbers.
- **A-13** Targets: WCAG 2.2 AA (contrast 4.5:1 text / 3:1 UI, target size 24×24 px, reflow at 320 px); Core Web Vitals "good" (LCP ≤ 2.5 s, CLS ≤ 0.1).
- **A-14** Cover URLs are root-relative paths to images shipped as web static assets; the seed uses a handful of them; no remote hosts. A missing file shows its alt text, nothing else changes.
- **A-15** Card shows the first 3 tags in stored order, then "+n more"; tags are text, not links.
- **A-16** Seed: 50 published posts (5 pages of 12, last one partial) dated over the past 365 days, 1 draft, 1 post scheduled 30 days ahead; the AC-49 edge counts are minimums that exercise each card state; deterministic content (fixed generator seed), dates relative to run time, upsert by slug (other rows untouched), refuses in production.
- **A-17** Server-rendered pages cannot use hooks; the README rule in S-3 ("hooks … the only callers of the API") is read as "only the web app's API client calls the API" — the README wording change is the plan's to propose.
- **A-18** API base URL and public site URL are server-side settings in the root `.env`; a missing one stops the app at start with a message naming it.
- **A-19** The list is public; the only personal data is the published author name.
- **A-20** Offset pagination drift is accepted: a post published between two page views can push one item to the next page.
- **A-21** Tiebreaker for equal publishedAt is post id descending.
- **A-22** The web app has no test suite (S-4); web-only criteria are verified by demo for this stage (P-2 deferred) — confirmed, user · 2026-10-20 (S-7).
- **A-23** Colour scheme follows `prefers-color-scheme` only (S-2). Superseded for the manual choice by `docs/specs/theme-toggle.md` (Light / Dark / System, default System), user · 2026-10-23; AC-12 still holds while the choice is System.
- **A-24** Card title links target `/posts/{slug}` and return 404 until the post-page spec ships; that 404 is expected, not a defect of this feature — user · 2026-10-20 (S-7).

## Open questions
none — both questions answered by the user on 2026-10-20 (S-7): list URL → AC-54 and § Contract; card link → AC-2, A-24.

## Proposals
- **P-1** RSS feed and `sitemap.xml` for listed posts — typical for a blog, aids discovery — rejected (deferred, user · 2026-10-20)
- **P-2** A web test suite (component + end-to-end with an automated axe scan) so the `demo` rows become `test` — a dependency gate — rejected (deferred, user · 2026-10-20; web rows stay `demo`, A-22)
- **P-3** Move focus to the `h1` after a client-side page change — screen-reader users otherwise lose their place (Nielsen: visibility of status) — rejected (deferred, user · 2026-10-20)
- **P-4** Rate limiting on the API — a public, unauthenticated endpoint — a dependency gate — rejected (deferred, user · 2026-10-20)
- **P-5** `ETag` / conditional GET and an RFC 8288 `Link` header (next/prev) on `GET /posts` — REST list practice — rejected (deferred, user · 2026-10-20)

## Traceability and verification
Suites: `api unit` = vitest `*.test.ts`, `api it` = vitest `*.it.test.ts` on real Postgres (S-3, S-4). Web rows are `demo` per A-22.

| ID | Story | Source | Method | Suite | Verification hint |
|---|---|---|---|---|---|
| AC-1 | US-1 | S-1 | demo | — | JS off: `GET /posts` 200, 12 `article` elements in the HTML |
| AC-2 | US-1 | S-2 | demo | — | each `article` has an `h2 > a`, excerpt, author, date, reading time |
| AC-3 | US-1 | A-6 | demo | — | `time[datetime]` holds the ISO value; text "Mon D, YYYY" in UTC |
| AC-4 | US-1 | A-5 | demo | — | text "<n> min read" equals the API's `readingTimeMinutes` |
| AC-5 | US-1 | S-2 | demo | — | `img` with stored `alt`, `srcset`, `sizes`; box ratio 16:9 |
| AC-6 | US-1 | S-2 | demo | — | seeded no-cover post: no `img` in its `article` |
| AC-7 | US-1 | A-15 | demo | — | 10-tag post: 3 tags + "+7 more" in a list labelled "Tags" |
| AC-8 | US-1 | S-2 | demo | — | no-tag post: no tag list element |
| AC-9 | US-1 | S-2 | demo | — | 150+ char title shown whole; 40-char word wraps inside the card |
| AC-10 | US-1 | S-1 | demo | — | title `<b>x</b>` shows the angle brackets; no `b` element |
| AC-11 | US-1 | A-11 | demo | — | 1/2/3 columns at 375, 800, 1280 px widths |
| AC-12 | US-1 | A-23 | demo | — | emulated dark scheme switches background and text tokens |
| AC-13 | US-1 | S-1 | demo | — | empty table: 200, "No posts yet.", no `nav[aria-label=Pagination]` |
| AC-14 | US-1 | S-1 | demo | — | API stopped: "Posts couldn't be loaded." + "Try again" link to the same URL |
| AC-15 | US-1 | A-10 | demo | — | error state HTML has robots `noindex` |
| AC-16 | US-1 | A-7 | demo | — | load page, stop API, reload within the window: list still shown |
| AC-17 | US-1 | S-1 | removed | — | removed 2026-10-21 (conflicts with AC-1) |
| AC-18 | US-2 | S-2 | demo | — | `/posts?page=5`: 200, 2 articles, "Page 5 of 5" |
| AC-19 | US-2 | S-2 | demo | — | `nav[aria-label=Pagination]` with Previous, 1–5, Next |
| AC-20 | US-2 | S-1 | demo | — | on page 3, link "3" has `aria-current="page"` |
| AC-21 | US-2 | S-2 | demo | — | page 1: "Previous" is not an `a` |
| AC-22 | US-2 | S-2 | demo | — | page 5: "Next" is not an `a` |
| AC-23 | US-2 | A-12 | demo | — with 97+ listed posts (9 pages), page 5 shows "1 … 4 5 6 … 9" |
| AC-24 | US-2 | S-2 | demo | — | click "Next" from the page bottom: viewport at the top of page 2 |
| AC-25 | US-2 | A-9 | demo | — | `/posts?page=6`: 404, `noindex`, link to `/posts` |
| AC-26 | US-2 | A-9 | demo | — | `page=0`, `-1`, `1.5`, `abc`, `01`, `page=2&page=3`: each 404 |
| AC-27 | US-2 | A-9 | demo | — | `/posts?page=1` → 308, `Location: /posts` |
| AC-28 | US-2 | A-10 | demo | — | `link[rel=canonical]` = site URL + `/posts?page=2`; no `utm_*` |
| AC-29 | US-2 | A-10 | demo | — | `?page=2&utm_source=x` renders the same articles as `?page=2` |
| AC-30 | US-2 | A-6 | demo | — | `<title>` texts on pages 1 and 2 |
| AC-31 | US-2 | A-6 | demo | — | `meta[name=description]` content |
| AC-32 | US-2 | A-10 | demo | — | pages 1–5 have no robots `noindex` |
| AC-33 | US-3 | S-1 | test | api it | 200, body parses with `PostsListResponse`, `page` 1, `pageSize` 12 |
| AC-34 | US-3 | S-2 | test | api it | draft and future rows absent from every page |
| AC-35 | US-3 | S-2 | test | api it | equal publishedAt rows ordered by id desc, same order on every call |
| AC-36 | US-3 | S-2 | test | api it | `page=2&pageSize=5` → items 6–10, totals 50 / 10 |
| AC-37 | US-3 | S-2 | test | api it | `page=99` → 200, `items: []`, totals 50 / 5 |
| AC-38 | US-3 | A-2 | test | api it | `page=0`, `page=10001`, `pageSize=51`, `page=a`, repeated → 400, `errors[0].param` |
| AC-39 | US-3 | S-2 | test | api it | item keys equal the `PostSummary` keys exactly |
| AC-40 | US-3 | A-5 | test | api unit | 0, 1, 200, 201 words → 1, 1, 1, 2 |
| AC-41 | US-3 | S-2 | test | api it | no-cover row → `coverImage: null` |
| AC-42 | US-3 | A-7 | test | api it | 200 response header `Cache-Control` |
| AC-43 | US-3 | A-7 | test | api it | 400 response header `Cache-Control: no-store` |
| AC-44 | US-3 | A-3 | test | api it | DB stopped → 503 problem, body has no SQL or stack text |
| AC-45 | US-3 | S-2 | test | api it | duplicate slug insert fails with a unique violation |
| AC-46 | US-3 | S-2 | test | api it | published row with null publishedAt fails |
| AC-47 | US-3 | A-4 | test | api it | cover URL without alt fails |
| AC-48 | US-4 | S-2 | test | api it | after seed: 50 published past, 1 draft, 1 future row |
| AC-49 | US-4 | S-2 | test | api it | the listed edge rows exist after seed |
| AC-50 | US-4 | A-16 | test | api it | second run: same slug set and row count |
| AC-51 | US-4 | A-16 | test | api it | `NODE_ENV=production`: non-zero exit, row count unchanged |
| AC-52 | US-4 | S-5 | test | api it | unmigrated DB: non-zero exit, message names `db:migrate` |
| AC-53 | US-4 | S-2 | test | api it | `GET /posts` after seed: `totalItems` 50, draft/future slugs absent |
| AC-54 | US-2 | S-7 | demo | — | `GET /` → 307, `Location: /posts` |
| NFR-1 | US-1 | A-8 | demo | — | API delayed 6 s: error state appears after ~5 s |
| NFR-2 | US-1 | A-7 | analysis | — | API request log: one call for 5 reloads within 60 s |
| NFR-3 | US-1 | A-7 | demo | — | row with publishedAt now+60 s appears ≤ 120 s after that time |
| NFR-4 | US-1 | A-13 | analysis | — | Lighthouse mobile report: LCP and CLS values |
| NFR-5 | US-3 | S-2 | inspection | — | the migration has an index matching filter + order |
| NFR-6 | US-1 | A-14 | demo | — | devtools network: only the web origin is requested |
| NFR-7 | US-1 | A-13 | analysis | — | contrast checker on tokens in both schemes |
| NFR-8 | US-1 | A-13 | demo | — | Tab walk: skip link first, visible focus on each stop |
| NFR-9 | US-1 | A-13 | demo | — | accessibility tree: landmarks and heading outline |
| NFR-10 | US-1 | A-13 | demo | — | Tab walk: one stop per card |
| NFR-11 | US-2 | A-13 | demo | — | measured link boxes ≥ 24×24 px |
| NFR-12 | US-1 | A-13 | demo | — | 320 px viewport: no horizontal scrollbar |
| NFR-13 | US-3 | S-4 | demo | — | API log line per request with the five fields |
| NFR-14 | US-1 | A-8 | demo | — | API stopped: web server log line with URL, reason, page |

## Self-check
- [x] Every AC and NFR is one EARS sentence with one trigger and an observable response — no "fast", "properly", "gracefully".
- [x] Every number is sourced (`S-n`) or an assumption (`A-n`).
- [x] Every user story has an AC and an Independent test; every `S-n` is cited at least once.
- [x] Every state-matrix cell holds an AC, an `A-n`, a marker or `n/a`.
- [x] Every AC and NFR has a row in § Traceability and verification.
- [x] No HOW: no file to change, library, layer or work order outside § Sources and § Must keep working.
- [x] A changed shared schema names every copy; a stored field names the migration gate.
- [x] At most 3 `[NEEDS CLARIFICATION]` markers, each repeated under § Open questions.
