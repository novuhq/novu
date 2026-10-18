import type { NextConfig } from 'next';

const usApiUrl = (process.env.NEXT_PUBLIC_NOVU_API_URL || 'https://api.novu.co').replace(/\/$/, '');

/** What the share image reads from disk (`src/lib/share-image.tsx`): its fonts and the design's drawings. */
const SHARE_IMAGE_FILES = [
  './assets/fonts/*.ttf',
  './public/illustrations/texture-glow.svg',
  './public/illustrations/dither-callout.svg',
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
