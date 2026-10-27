import type { NextConfig } from 'next';

/**
 * The browser always calls this site at /api/v1. Next forwards that to the API so the
 * login cookie stays first-party. A direct call to another host drops the session.
 * On Vercel, API_PROXY_ORIGIN is the backend origin with no path. Locally it is the API on port 4000.
 */
function apiProxyOrigin(): string {
  const configured = process.env.API_PROXY_ORIGIN?.trim().replace(/\/$/, '');
  if (configured) return configured;
  if (process.env.VERCEL) {
    throw new Error('API_PROXY_ORIGIN is required on Vercel (backend origin, no path).');
  }
  return 'http://127.0.0.1:4000';
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${apiProxyOrigin()}/api/v1/:path*` }];
  },
  /**
   * Feature screens live in src/pages/*.tsx (campus-style modules).
   * Next.js treats src/pages as the Pages Router, so route files use the
   * `page.tsx` extension (`layout.page.tsx`, `page.page.tsx`). Plain `.tsx`
   * modules under src/pages are not routes.
   */
  pageExtensions: ['page.tsx', 'page.ts'],
};

export default nextConfig;
