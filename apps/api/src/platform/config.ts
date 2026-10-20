/**
 * Cross-cutting: the one place that reads the environment. Validated once at start-up (onion-architecture §10).
 */
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1).default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.string().min(1).default('info'),
  DATABASE_URL: z.url(),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: string;
  databaseUrl: string;
}

/** Throws `Error("Invalid environment: <VAR> <reason>")`; never echoes a value (the URL carries a password). */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const reasons = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'env'} ${issue.message}`);
    throw new Error(`Invalid environment: ${reasons.join('; ')}`);
  }
  const e = parsed.data;
  return { nodeEnv: e.NODE_ENV, host: e.API_HOST, port: e.API_PORT, logLevel: e.LOG_LEVEL, databaseUrl: e.DATABASE_URL };
}
