/**
 * loadConfig(env). Unit test: no database, process.env is never read (an explicit env object is passed).
 * Oracles: plan § Test brief WP3.tests [T2], plan § Contract (API test seams), WP3 step 1, security §11.
 */
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/platform/config.js';

const DATABASE_URL = 'postgres://u:p@h:5432/d';

function messageOf(env: Record<string, string | undefined>): string {
  try {
    loadConfig(env);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    return (error as Error).message;
  }
  throw new Error('loadConfig should have thrown');
}

describe('loadConfig', () => {
  it('throws a message naming DATABASE_URL when it is missing', () => {
    expect(messageOf({})).toContain('DATABASE_URL');
  });

  it('throws a message naming DATABASE_URL when it is not a URL', () => {
    expect(messageOf({ DATABASE_URL: 'not a url' })).toContain('DATABASE_URL');
  });

  it('never echoes the credentials of an invalid DATABASE_URL', () => {
    expect(messageOf({ DATABASE_URL: 'postgres//u:hunter2-password@h/d' })).not.toContain('hunter2-password');
  });

  it('fills the defaults when only DATABASE_URL is set', () => {
    expect(loadConfig({ DATABASE_URL })).toEqual({
      nodeEnv: 'development',
      host: '127.0.0.1',
      port: 3001,
      logLevel: 'info',
      databaseUrl: DATABASE_URL,
    });
  });

  it('reads every setting from the env', () => {
    expect(
      loadConfig({ DATABASE_URL, NODE_ENV: 'production', API_HOST: '0.0.0.0', API_PORT: '8080', LOG_LEVEL: 'debug' }),
    ).toEqual({ nodeEnv: 'production', host: '0.0.0.0', port: 8080, logLevel: 'debug', databaseUrl: DATABASE_URL });
  });

  it.each(['abc', '0', '65536', '-1', '1.5', ''])('throws a message naming API_PORT for API_PORT=%j', (API_PORT) => {
    expect(messageOf({ DATABASE_URL, API_PORT })).toContain('API_PORT');
  });

  it('accepts the port limits 1 and 65535', () => {
    expect(loadConfig({ DATABASE_URL, API_PORT: '1' }).port).toBe(1);
    expect(loadConfig({ DATABASE_URL, API_PORT: '65535' }).port).toBe(65535);
  });

  it('throws a message naming NODE_ENV for an unknown environment', () => {
    expect(messageOf({ DATABASE_URL, NODE_ENV: 'staging' })).toContain('NODE_ENV');
  });

  it('accepts development, test and production', () => {
    for (const nodeEnv of ['development', 'test', 'production'] as const) {
      expect(loadConfig({ DATABASE_URL, NODE_ENV: nodeEnv }).nodeEnv).toBe(nodeEnv);
    }
  });
});
