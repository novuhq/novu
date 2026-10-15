import type { NextConfig } from 'next';

const usApiUrl = (process.env.NEXT_PUBLIC_NOVU_API_URL || 'https://api.novu.co').replace(/\/$/, '');

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
};

export default nextConfig;
