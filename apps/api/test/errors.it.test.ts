/**
 * Error translation and request logging of the app.
 * Oracles: plan Contract (errors, titles, fixed detail per status), WP3 step 4 (error handler, onResponse hook),
 * spec AC-43, AC-44, NFR-13, security §4 / §11 (generic errors, no secrets in logs).
 *
 * The detail sentences are pinned by the implementer's handoff, not by the spec (the spec fixes only the 503 title).
 */
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ProblemDetails } from '@blog/contracts/errors';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAppWithDatabaseUrl, createTestApp } from './helpers/app.js';

const UNREACHABLE = 'postgres://blog:probe-password@127.0.0.1:1/blog';
const apiDir = fileURLToPath(new URL('..', import.meta.url));

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
  // Test-only routes on the real app, so that its real error handler translates what they throw.
  app.get('/boom', async () => {
    throw new Error('internal detail: select * from users where password = hunter2');
  });
  app.post('/echo', async () => ({ ok: true }));
});

afterAll(async () => {
  await app?.close();
});

describe('error handler', () => {
  it('turns an unexpected error into a generic 500 problem that leaks nothing (security A02)', async () => {
    const response = await app.inject({ method: 'GET', url: '/boom' });

    expect(response.statusCode).toBe(500);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = response.json<ProblemDetails>();
    expect(ProblemDetails.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({
      type: 'about:blank',
      title: 'Internal server error',
      status: 500,
      detail: 'An unexpected error occurred.',
    });
    expect(response.body).not.toContain('hunter2');
    expect(response.body).not.toMatch(/select \*|    at /i);
  });

  it('keeps the status of a framework 4xx (malformed JSON -> 400) as a no-store problem', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{ not json',
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json<ProblemDetails>()).toMatchObject({ type: 'about:blank', status: 400 });
    expect(response.body).not.toMatch(/JSON|position|token/);
  });

  it('keeps the status of a framework 4xx (unsupported media type -> 415) as a no-store problem', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/xml' },
      payload: '<a/>',
    });

    expect(response.statusCode).toBe(415);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json<ProblemDetails>().status).toBe(415);
  });

  it('answers 503 with the fixed detail when the database cannot be reached (AC-44)', async () => {
    const unreachable = await createAppWithDatabaseUrl(UNREACHABLE);
    try {
      const response = await unreachable.inject({ method: 'GET', url: '/posts' });

      expect(response.statusCode).toBe(503);
      expect(response.json<ProblemDetails>()).toMatchObject({
        type: 'about:blank',
        title: 'Service unavailable',
        status: 503,
        detail: 'The service is temporarily unavailable.',
      });
    } finally {
      await unreachable.close();
    }
  });

  it('answers 404 and 400 with the fixed detail sentences', async () => {
    const notFound = await app.inject({ method: 'GET', url: '/nope' });
    const invalid = await app.inject({ method: 'GET', url: '/posts?page=0' });

    expect(notFound.json<ProblemDetails>().detail).toBe('The requested resource was not found.');
    expect(invalid.json<ProblemDetails>().detail).toBe('The request is invalid.');
  });
});

describe('request log (NFR-13)', () => {
  interface LogLine {
    level: number;
    msg?: string;
    reqId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    durationMs?: number;
    err?: { message?: string; stack?: string };
  }

  let stdout = '';
  let lines: LogLine[] = [];

  beforeAll(async () => {
    stdout = await new Promise<string>((resolve, reject) => {
      execFile(
        process.execPath,
        ['--import', 'tsx', 'test/errors-log-probe.ts', UNREACHABLE],
        { cwd: apiDir, timeout: 60_000, env: { ...process.env, NODE_ENV: 'test' } },
        (error, out) => (error ? reject(error) : resolve(out)),
      );
    });
    lines = stdout
      .split('\n')
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line) as LogLine);
  }, 90_000);

  /** The per-request line: the one that carries the status code. */
  const requestLine = (path: string) => lines.filter((line) => line.statusCode !== undefined && line.path === path);

  it('writes exactly one line per request with reqId, method, path, statusCode and durationMs', () => {
    for (const [path, statusCode] of [
      ['/nope', 404],
      ['/posts', 503],
      ['/boom', 500],
    ] as const) {
      const found = requestLine(path);
      expect(found, `request log lines for ${path}`).toHaveLength(1);
      expect(found[0]).toMatchObject({ method: 'GET', path, statusCode });
      expect(typeof found[0]?.reqId).toBe('string');
      expect(found[0]?.reqId?.length).toBeGreaterThan(0);
      expect(typeof found[0]?.durationMs).toBe('number');
      expect(found[0]?.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('logs the method of the request, not a fixed one', () => {
    expect(requestLine('/gone')[0]).toMatchObject({ method: 'DELETE', statusCode: 404 });
  });

  it('writes no other non-error line for a request: no separate "incoming request" line', () => {
    const reqId = requestLine('/nope')[0]?.reqId;
    expect(lines.filter((line) => line.reqId === reqId && line.level < 50)).toHaveLength(1);
  });

  it('gives each request its own request id', () => {
    const ids = [requestLine('/nope'), requestLine('/posts'), requestLine('/boom')].map((found) => found[0]?.reqId);
    expect(new Set(ids).size).toBe(3);
  });

  it('logs the path without the query string', () => {
    expect(lines.filter((line) => line.path?.includes('?'))).toEqual([]);
    expect(stdout).not.toContain('secret-token');
  });

  it('logs every 5xx with its error at error level, under the same request id', () => {
    for (const path of ['/posts', '/boom']) {
      const reqId = requestLine(path)[0]?.reqId;
      const errorLines = lines.filter((line) => line.level >= 50 && line.reqId === reqId);
      expect(errorLines.length, `error lines for ${path}`).toBeGreaterThanOrEqual(1);
      expect(typeof errorLines[0]?.err?.message).toBe('string');
    }
  });

  it('logs the unexpected error with its message, so that an operator can see it', () => {
    const reqId = requestLine('/boom')[0]?.reqId;
    const errorLine = lines.find((line) => line.level >= 50 && line.reqId === reqId);
    expect(errorLine?.err?.message).toContain('hunter2');
  });

  it('logs no error line for a 4xx', () => {
    const reqId = requestLine('/nope')[0]?.reqId;
    expect(lines.filter((line) => line.level >= 50 && line.reqId === reqId)).toEqual([]);
  });

  it('never writes the database credentials to the log (security A09)', () => {
    expect(stdout).not.toContain('probe-password');
  });
});
