# Blog

pnpm monorepo: Next.js frontend, Fastify API, Drizzle + PostgreSQL, Zod contracts shared by both sides.

```
apps/
  web/                    Next.js (App Router, React)
    src/app/              routes only: page/layout compose, no business logic
                          route-local UI → app/<segment>/_components/<Name>/
    src/components/       UI shared by 2+ routes, grouped by domain (kebab-case)
    src/lib/              API client, providers, narrowly named app-wide helpers (no utils.ts)
    src/lib/hooks/        data hooks per domain, the only callers of the API
    public/               static assets
  api/                    Fastify (onion / ports-and-adapters)
    src/modules/<name>/   vertical slices: routes.ts → service.ts → repository.ts (+ helpers.ts, constants.ts)
    src/db/schema/        Drizzle table definitions, one file per domain
    src/adapters/         implementations of ports (third-party SDKs, external services)
    src/platform/         cross-cutting: config (validated env), errors, container (composition root)
    drizzle/              generated SQL migrations (drizzle-kit)
    test/                 *.test.ts (unit), *.it.test.ts (real Postgres)
packages/
  contracts/              Zod schemas for request/response shapes; types via z.infer
                          imported per file: @blog/contracts/posts
```

Dependency direction:
- **api:** routes → service → repository → db. Only repositories import `drizzle-orm`, and only `routes.ts` imports `fastify`.
- **web:** contracts → lib → routes/components. Never import another route's `_components/`.
- **contracts:** imports only `zod`.

## Getting started

```bash
cp .env.example .env
pnpm install
pnpm db:up                         # Postgres in Docker
pnpm --filter @blog/api db:generate  # after adding tables to src/db/schema
pnpm --filter @blog/api db:migrate
pnpm dev                           # web + api
```
