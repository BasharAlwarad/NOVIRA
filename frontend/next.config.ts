import type { NextConfig } from 'next';

// Isolated verification runs (a second `next dev`/`next build` against this
// same checkout, used to test changes without touching the founder's own
// running dev server) must never write into the real `.next` — found live
// 2026-10-11 that an earlier isolated `npm run build` silently overwrote the
// founder's dev-mode build cache, producing a real but confusing 404 on a
// route that genuinely existed in source. Set NOVIRA_VERIFY_DIST_DIR (e.g.
// `.next-verify`) for any isolated run; normal `npm run dev`/`npm run build`
// is unaffected since the env var is unset by default.
const nextConfig: NextConfig = {
  distDir: process.env.NOVIRA_VERIFY_DIST_DIR || '.next',
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
