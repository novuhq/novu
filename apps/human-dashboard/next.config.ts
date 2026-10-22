import type { NextConfig } from 'next';

import { SITE_INDEXED, SITE_ORIGIN } from './src/lib/seo';

const usApiUrl = (process.env.NEXT_PUBLIC_NOVU_API_URL || 'https://api.novu.co').replace(/\/$/, '');

/** Where language models find what this site has for them (`/llms.txt`). */
const LLMS_LINK = `<${SITE_ORIGIN}/llms.txt>; rel="describedby"`;

/** The website pages and their text versions, which search engines leave out while `SITE_INDEXED` is off. */
const WEBSITE_PATHS = ['/', '/sapien', '/index.md', '/llms.txt'];

const NOINDEX = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };

/** What the share image reads from disk (`src/lib/share-image.tsx`): its fonts and the design's drawings. */
const SHARE_IMAGE_FILES = [
  './assets/fonts/*.ttf',
  './public/illustrations/texture-glow.svg',
  './public/illustrations/dither-callout.svg',
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Turbopack's build cache, which Vercel restores from the last deployment, kept serving the old stylesheet
    // after `globals.css` changed (Next 16.3.8): the people page shipped without its colours and faces. Builds
    // start cold instead.
    turbopackFileSystemCacheForBuild: false,
  },
  // The website's old addresses, from when it was gethuman.md.
  async redirects() {
    return [
      { source: '/sapien.html', destination: '/sapien', permanent: true },
      { source: '/human.md', destination: '/index.md', permanent: true },
    ];
  },
  async headers() {
    return [
      // The robots page says where its Markdown is, and both website pages where `/llms.txt` is.
      {
        source: '/',
        headers: [
          { key: 'Link', value: `<${SITE_ORIGIN}/index.md>; rel="alternate"; type="text/markdown", ${LLMS_LINK}` },
        ],
      },
      { source: '/sapien', headers: [{ key: 'Link', value: LLMS_LINK }] },
      // Out of search results until launch, also the Markdown and text, which carry no `<meta name="robots">`.
      ...(SITE_INDEXED ? [] : WEBSITE_PATHS.map((source) => ({ source, headers: [NOINDEX] }))),
      // Preview and development deployments stay out of search results.
      ...(process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development'
        ? [{ source: '/:path*', headers: [NOINDEX] }]
        : []),
    ];
  },
  async rewrites() {
    return [
      {
        source: '/v1/agents/email/actions/preview',
        destination: `${usApiUrl}/v1/agents/email/actions/preview`,
      },
      {
        source: '/v1/agents/email/actions/execute',
        destination: `${usApiUrl}/v1/agents/email/actions/execute`,
      },
    ];
  },
  // The routes that draw a share image read these files, which the build can't tell from their code.
  outputFileTracingIncludes: {
    '/configure/share-image': SHARE_IMAGE_FILES,
    '/p/**': SHARE_IMAGE_FILES,
  },
};

export default nextConfig;
