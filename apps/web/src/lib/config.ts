import 'server-only';
import { z } from 'zod';

const ServerEnv = z.object({
  API_BASE_URL: z.url(),
  SITE_URL: z.url(),
});

export type ServerConfig = z.infer<typeof ServerEnv>;

let cached: ServerConfig | undefined;

/** Validated server settings; the only place that reads process.env. */
export function getServerConfig(): ServerConfig {
  if (cached) return cached;
  const result = ServerEnv.safeParse({
    API_BASE_URL: process.env.API_BASE_URL,
    SITE_URL: process.env.SITE_URL,
  });
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => String(i.path[0])))];
    throw new Error(`Missing or invalid env: ${names.join(', ')}`);
  }
  cached = result.data;
  return cached;
}
