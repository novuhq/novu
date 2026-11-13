/**
 * GET /api/novu-config?subscriberId=<id>
 *
 * The settings the pages pass to Novu, read from the server's environment when a page loads, so one build works
 * against any Novu (a Novu Box sets them when it starts). `subscriberId` picks the subscriber. Unset values are left
 * out, so the page keeps the build's. It never returns an HMAC hash: the route is public on a box, and a hash for any
 * subscriber would let anyone sign in as them.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { NovuConfig } from '@/utils/config';

// By name: Next replaces `process.env.NEXT_PUBLIC_…` with its value at build time.
function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export default function handler(req: NextApiRequest, res: NextApiResponse<Partial<NovuConfig>>) {
  const requested = typeof req.query.subscriberId === 'string' ? req.query.subscriberId : undefined;
  const socketType = env('NEXT_PUBLIC_NOVU_SOCKET_TYPE');

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    applicationIdentifier: env('NEXT_PUBLIC_NOVU_APP_ID'),
    subscriberId: requested || env('NEXT_PUBLIC_NOVU_SUBSCRIBER_ID'),
    backendUrl: env('NEXT_PUBLIC_NOVU_BACKEND_URL'),
    socketUrl: env('NEXT_PUBLIC_NOVU_SOCKET_URL'),
    socketOptions: socketType === 'cloud' || socketType === 'self-hosted' ? { socketType } : undefined,
  });
}
