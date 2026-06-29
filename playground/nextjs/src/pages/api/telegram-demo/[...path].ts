/**
 * Offline simulator for the Telegram subscriber-link flow.
 *
 * Lets you exercise the `useTelegramSubscriberLink` headless logic end-to-end
 * WITHOUT a real Telegram bot, agent, or secret key. Point the page at it with:
 *
 *   NEXT_PUBLIC_CONNECT_TELEGRAM_API_URL=/api/telegram-demo
 *
 * It mimics the two endpoints the hook calls:
 *   POST .../integrations/channel-endpoints/link  -> issues a fake deep link + expiry
 *   GET  .../channel-endpoints                    -> reports connection after CONNECT_DELAY_MS
 *
 * The "connection" auto-confirms a few seconds after the link is issued so you
 * can watch the status transition pending -> connected.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const CONNECT_DELAY_MS = 6_000;
const EXPIRY_MS = 5 * 60_000;
const BOT_USERNAME = 'novu_playground_bot';

// Module-level state — fine for a single-user local playground.
let issuedAt: number | null = null;

function randomCode(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = req.url ?? '';

  if (req.method === 'POST' && url.includes('/integrations/channel-endpoints/link')) {
    issuedAt = Date.now();
    const code = randomCode();

    res.status(200).json({
      data: {
        url: `https://t.me/${BOT_USERNAME}?start=${code}`,
        providerMetadata: {
          botUsername: BOT_USERNAME,
          expiresAt: new Date(Date.now() + EXPIRY_MS).toISOString(),
        },
      },
    });

    return;
  }

  if (req.method === 'GET' && url.includes('/channel-endpoints')) {
    const connected = issuedAt !== null && Date.now() - issuedAt >= CONNECT_DELAY_MS;

    res.status(200).json({
      data: connected ? [{ identifier: 'demo-endpoint' }] : [],
    });

    return;
  }

  res.status(404).json({ message: `telegram-demo: unhandled ${req.method} ${url}` });
}
