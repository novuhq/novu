import type { NextConfig } from 'next';

/** What the share image reads from disk (`src/lib/share-image.tsx`): its fonts and the design's drawings. */
const SHARE_IMAGE_FILES = [
  './assets/fonts/*.ttf',
  './public/illustrations/texture-glow.svg',
  './public/illustrations/dither-callout.svg',
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The routes that draw a share image read these files, which the build can't tell from their code.
  outputFileTracingIncludes: {
    '/configure/share-image': SHARE_IMAGE_FILES,
    '/p/**': SHARE_IMAGE_FILES,
  },
};

export default nextConfig;
