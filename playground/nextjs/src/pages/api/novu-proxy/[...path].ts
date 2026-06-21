/**
 * Catch-all proxy: forwards `/api/novu-proxy/<path>` to the Novu API and injects
 * the server-side `Authorization: ApiKey <NOVU_SECRET_KEY>` header.
 *
 * WHY THIS EXISTS
 * The Telegram subscriber-link endpoint requires `AGENT_WRITE` permission, so it
 * must be called with a secret key — which must never reach the browser. The
 * `useTelegramSubscriberLink` hook is pointed at this proxy (`apiUrl: '/api/novu-proxy'`)
 * so the headless logic runs in the browser while the secret stays server-side.
 *
 * Required ENV vars:
 *   NOVU_SECRET_KEY     Novu API secret (sk_...) — injected as `ApiKey` auth
 *   NOVU_API_BASE_URL   Optional Novu API base URL (falls back to NEXT_PUBLIC_NOVU_BACKEND_URL, then https://api.novu.co)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const BASE_URL = (
  process.env.NOVU_API_BASE_URL ??
  process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ??
  'https://api.novu.co'
).replace(/\/$/, '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secretKey = process.env.NOVU_SECRET_KEY?.trim();

  if (!secretKey) {
    res.status(500).json({ message: 'NOVU_SECRET_KEY is not configured on the server.' });

    return;
  }

  const segments = req.query.path;
  const pathParts = Array.isArray(segments) ? segments : [segments].filter(Boolean);
  const upstreamPath = (pathParts as string[]).map(encodeURIComponent).join('/');

  const queryIndex = req.url?.indexOf('?') ?? -1;
  const search = queryIndex >= 0 ? req.url!.slice(queryIndex) : '';
  const upstreamUrl = `${BASE_URL}/${upstreamPath}${search}`;

  const headers: Record<string, string> = {
    Authorization: `ApiKey ${secretKey}`,
  };

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    headers['Content-Type'] = 'application/json';
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, { method: req.method, headers, body });
  } catch (error) {
    res.status(502).json({
      message: `Failed to reach Novu API at ${BASE_URL}: ${error instanceof Error ? error.message : String(error)}`,
    });

    return;
  }

  const text = await upstream.text();
  const contentType = upstream.headers.get('content-type');
  if (contentType) {
    res.setHeader('content-type', contentType);
  }

  res.status(upstream.status).send(text);
}
