import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// One env file for both apps (same pattern as apps/api/drizzle.config.ts).
const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const nextConfig: NextConfig = {
  transpilePackages: ['@blog/contracts'],
  typedRoutes: true,
  async redirects() {
    return [{ source: '/', destination: '/posts', permanent: false }];
  },
};

export default nextConfig;
