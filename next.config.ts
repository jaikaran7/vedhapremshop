import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  /**
   * Feature screens live in src/pages/*.tsx (campus-style modules).
   * Next.js treats src/pages as the Pages Router, so route files use the
   * `page.tsx` extension (`layout.page.tsx`, `page.page.tsx`). Plain `.tsx`
   * modules under src/pages are not routes.
   */
  pageExtensions: ['page.tsx', 'page.ts'],
};

export default nextConfig;
