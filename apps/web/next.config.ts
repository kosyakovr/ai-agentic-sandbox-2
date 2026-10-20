import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@blog/contracts'],
  typedRoutes: true,
};

export default nextConfig;
