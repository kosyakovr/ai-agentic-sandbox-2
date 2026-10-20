# Insights — the repository

Things a future session cannot work out from the code. Findings that span several
top-level directories, or that belong to the repository itself (CI, tooling, root
scripts), go in the root `INSIGHTS.md`. Anything scoped to one directory goes in the
nearest `INSIGHTS.md` above the files it concerns.

- Entry: `- YYYY-MM-DD — <what surprised us> → <what to do instead>. (ref: file:line / PR)`
- Append only. Never rewrite an entry. Correct it with a dated line beneath it.
- Never trim this file yourself. Past 100 lines, propose a consolidation pass.
- Settled knowledge moves to the project's docs. This file is the draft, not the doc.
- Captured by the `sdd-engineering:engineering-insights` skill.

## What Works

## What Doesn't Work

- 2026-10-21 — `pkill -f next-server` to stop a test server also killed unrelated user Next servers on ports 3000/3001 → start test servers on spare ports and stop them by PID only: `lsof -ti tcp:<port> -sTCP:LISTEN | xargs kill`. (`pkill -f "next start"` misses the real `next-server` process, so a stale server keeps serving old builds.) (ref: posts-list run)
- 2026-10-21 — Running `pnpm` inside a git worktree whose `node_modules/.bin` is a symlink rewrote the real shims to the worktree path; `next dev`/`next build` in such a copy writes `apps/web/AGENTS.md` and can auto-install into the shared `node_modules` → build the worktree's `node_modules` from per-entry symlinks, point `@blog/contracts` at the worktree copy, and call binaries directly, never `pnpm`/`next dev` there. (ref: posts-list red-proof runs)

## Codebase Patterns

- 2026-10-21 — `apps/web/src/proxy.ts` and the pages are separate bundles, so module-level state is not shared: the posts cache doubled API calls (2 per page per 60 s, breaking spec NFR-2) → keep per-process state both need on a `globalThis` slot keyed with `Symbol.for(...)`. (ref: apps/web/src/lib/posts.ts:16)

## Tool & Library Notes

- 2026-10-21 — Next 16.4.2: `notFound()` thrown from a page gives status 404 but an empty `<html id="__next_error__">` body; the not-found UI exists only in the RSC payload, so no-JS clients and crawlers see a blank page (unmatched URLs render fine) → do range/validity 404s in `proxy.ts` by rewriting to an unmatched path with `{ status: 404 }`, and put the UI in root `app/not-found.tsx`. (ref: apps/web/src/proxy.ts)
- 2026-10-21 — drizzle-kit emits `.desc()` index columns as `DESC NULLS LAST`, which a plain `ORDER BY x DESC` (NULLS FIRST) cannot use → write `DESC NULLS LAST` explicitly in queries meant to hit such an index. (ref: apps/api/src/modules/posts/repository.ts, apps/api/drizzle/0000_worthless_fat_cobra.sql)
- 2026-10-21 — `process.loadEnvFile` and `tsx --env-file` never override a variable already in the environment, even an empty one → a caller's `DATABASE_URL` wins over the root `.env` (the seed tests rely on it), and `SITE_URL= pnpm --filter @blog/web build` reproduces the missing-env failure. (ref: apps/web/next.config.ts, apps/api/test/seed.it.test.ts)
- 2026-10-21 — `psql` is not installed on the host → query the dev Postgres with `docker exec blog-db-1 psql -U blog -d <db> -c '...'`. (ref: docker-compose.yml)

## Recurring Errors & Fixes

## Session Notes

- 2026-10-21 — posts-list (spec docs/specs/posts-list.md, plan docs/plans/posts-list.md): 7 entries from the multi-agent run.

## Open Questions

- 2026-10-21 — Fastify 5.12 warns FSTDEP023: the plan-mandated `disableRequestLogging` is deprecated for `logController` → should the single-line request log (NFR-13) move to `logController` before a Fastify upgrade removes the option? (ref: apps/api/src/app.ts:46)
