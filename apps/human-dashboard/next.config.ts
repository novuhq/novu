import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      // The account page became the dashboard (NV-8965). Old links and bookmarks land on its first page.
      { source: '/account', destination: '/agent', permanent: false },
    ];
  },
};

export default nextConfig;
