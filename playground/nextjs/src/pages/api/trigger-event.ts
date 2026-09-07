/**
 * POST /api/trigger-event
 *
 * Thin server-side proxy that forwards the request to the Novu `/v1/events/trigger`
 * endpoint, injecting the secret key from the server environment.
 *
 * Required ENV vars:
 *   NOVU_SECRET_KEY        Novu API secret (sk_...)
 *   NOVU_API_BASE_URL      Optional Novu API base URL (falls back to NEXT_PUBLIC_NOVU_BACKEND_URL)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

type RequestBody = {
  name?: string;
  to?: unknown;
  payload?: unknown;
};

type ResponseData = Record<string, unknown>;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });

    return;
  }

  const secretKey = process.env.NOVU_SECRET_KEY?.trim();

  if (!secretKey) {
    res.status(500).json({ error: 'NOVU_SECRET_KEY is not configured' });

    return;
  }

  const body = req.body as RequestBody;

  if (!body.name) {
    res.status(400).json({ error: 'name (workflow ID) is required' });

    return;
  }

  if (!body.to) {
    res.status(400).json({ error: 'to (subscriber) is required' });

    return;
  }

  const backendUrl = (
    process.env.NOVU_API_BASE_URL ??
    process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ??
    'https://api.novu.co'
  ).replace(/\/+$/, '');

  try {
    const upstream = await fetch(`${backendUrl}/v1/events/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${secretKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await upstream.json()) as ResponseData;

    res.status(upstream.status).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    res.status(500).json({ error: message });
  }
}
