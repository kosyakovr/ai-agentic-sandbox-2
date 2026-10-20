/**
 * Test infrastructure: builds the API app against the isolated test database.
 *
 * The source modules are imported dynamically and the exports are asserted, so that while the implementation does not
 * exist yet a test fails on a readable assertion ("buildApp is not exported") and not on an import crash.
 */
import type { FastifyInstance } from 'fastify';
import { expect } from 'vitest';
import { getTestDatabaseUrl } from './db.js';

/** `buildApp(loadConfig({ ...process.env, DATABASE_URL: <test db> }), { logger: false })`, ready to `inject()`. */
export async function createTestApp(): Promise<FastifyInstance> {
  return createAppWithDatabaseUrl(getTestDatabaseUrl());
}

/** Same app, pointed at another database URL (for example an unreachable one). */
export async function createAppWithDatabaseUrl(databaseUrl: string): Promise<FastifyInstance> {
  let appModule: Partial<typeof import('../../src/app.js')> = {};
  let configModule: Partial<typeof import('../../src/platform/config.js')> = {};
  let importError: unknown;
  try {
    appModule = await import('../../src/app.js');
    configModule = await import('../../src/platform/config.js');
  } catch (error) {
    importError = error;
  }

  expect(
    typeof appModule.buildApp,
    `apps/api/src/app.ts must export a buildApp function${importError ? ` (import failed: ${String(importError)})` : ''}`,
  ).toBe('function');
  expect(
    typeof configModule.loadConfig,
    'apps/api/src/platform/config.ts must export a loadConfig function',
  ).toBe('function');

  const config = configModule.loadConfig!({ ...process.env, DATABASE_URL: databaseUrl });
  return appModule.buildApp!(config, { logger: false });
}
