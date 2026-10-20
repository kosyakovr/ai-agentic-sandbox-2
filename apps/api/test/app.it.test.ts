/**
 * App bootstrap behaviour that needs no row in the database: unknown routes, headers.
 * Oracles: plan § Test brief WP3.tests [T2], plan Contract (errors), WP3 step 4, Non-goals; spec AC-43, A-24, NFR-6.
 */
import { ProblemDetails } from '@blog/contracts/errors';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/app.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app?.close();
});

describe('unknown routes', () => {
  it('answers GET /nope with a 404 problem and Cache-Control: no-store', async () => {
    const response = await app.inject({ method: 'GET', url: '/nope' });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = response.json<ProblemDetails>();
    expect(ProblemDetails.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({ type: 'about:blank', title: 'Not found', status: 404 });
    expect(body.detail.length).toBeGreaterThan(0);
  });

  it('answers GET /posts/<slug> with 404: the post page does not exist yet (A-24)', async () => {
    const response = await app.inject({ method: 'GET', url: '/posts/some-slug' });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)('has no %s /posts route: the API is read-only', async (method) => {
    const response = await app.inject({ method, url: '/posts', payload: {} });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
  });

  it('does not echo the requested path or any query text in the 404 body', async () => {
    const response = await app.inject({ method: 'GET', url: '/secret-path-marker?token=secret-token-marker' });

    expect(response.body).not.toContain('secret-path-marker');
    expect(response.body).not.toContain('secret-token-marker');
  });
});

describe('response headers', () => {
  it('sends the helmet security headers', async () => {
    const response = await app.inject({ method: 'GET', url: '/nope' });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('registers no CORS: a cross-origin request gets no Access-Control-Allow-Origin (NFR-6)', async () => {
    const response = await app.inject({ method: 'GET', url: '/nope', headers: { origin: 'https://evil.test' } });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
