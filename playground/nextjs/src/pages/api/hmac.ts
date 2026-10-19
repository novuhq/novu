/**
 * GET /api/hmac
 *
 * Mints HMAC-SHA256 hashes for the playground NovuProvider session.
 * Required when Security HMAC encryption is enabled on the In-App integration.
 *
 * Required ENV vars:
 *   NOVU_SECRET_KEY                   Novu API secret
 *   NEXT_PUBLIC_NOVU_SUBSCRIBER_ID    Subscriber id to sign
 */

import { createHmac } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectChatContext } from '@/utils/connect-chat-context';

type ResponseData =
  | {
      subscriberId: string;
      subscriberHash: string;
      context?: typeof connectChatContext;
      contextHash?: string;
    }
  | { error: string };

/**
 * RFC-8259-style canonical JSON (sorted keys, no floats) — matches `@tufjs/canonical-json`
 * used by Novu when validating `contextHash`.
 */
function canonicalize(value: unknown): string {
  if (typeof value === 'string') {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  if (typeof value === 'boolean' || value === null || Number.isInteger(value)) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as object).sort();
    const entries = keys.map((key) => `${canonicalize(key)}:${canonicalize((value as Record<string, unknown>)[key])}`);

    return `{${entries.join(',')}}`;
  }

  throw new TypeError(`cannot canonicalize ${String(value)}`);
}

function hmacHex(secretKey: string, value: string): string {
  return createHmac('sha256', secretKey).update(value).digest('hex');
}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });

    return;
  }

  const secretKey = process.env.NOVU_SECRET_KEY?.trim();
  const subscriberId = process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID?.trim();

  if (!secretKey) {
    res.status(500).json({ error: 'NOVU_SECRET_KEY is not configured' });

    return;
  }

  if (!subscriberId) {
    res.status(500).json({ error: 'NEXT_PUBLIC_NOVU_SUBSCRIBER_ID is not configured' });

    return;
  }

  const subscriberHash = hmacHex(secretKey, subscriberId);
  const context = connectChatContext;

  if (!context) {
    res.status(200).json({ subscriberId, subscriberHash });

    return;
  }

  const contextHash = hmacHex(secretKey, canonicalize(context));

  res.status(200).json({ subscriberId, subscriberHash, context, contextHash });
}
