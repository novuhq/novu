/**
 * POST /api/fcm-register-token
 *
 * Saves an FCM web registration token on a Novu subscriber via
 * PUT /v1/subscribers/:subscriberId/credentials.
 *
 * Required ENV vars:
 *   NOVU_SECRET_KEY
 * Optional:
 *   NOVU_API_BASE_URL / NEXT_PUBLIC_NOVU_BACKEND_URL
 *   NEXT_PUBLIC_FCM_INTEGRATION_IDENTIFIER
 */

import type { NextApiRequest, NextApiResponse } from 'next';

type RequestBody = {
  subscriberId?: string;
  deviceToken?: string;
  integrationIdentifier?: string;
};

type ResponseData = Record<string, unknown>;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'PUT' && req.method !== 'POST') {
    res.setHeader('Allow', 'PUT, POST');
    res.status(405).json({ error: 'Method not allowed' });

    return;
  }

  const secretKey = process.env.NOVU_SECRET_KEY?.trim();

  if (!secretKey) {
    res.status(500).json({ error: 'NOVU_SECRET_KEY is not configured' });

    return;
  }

  const body = req.body as RequestBody;
  const subscriberId = body.subscriberId?.trim();
  const deviceToken = body.deviceToken?.trim();
  const integrationIdentifier =
    body.integrationIdentifier?.trim() || process.env.NEXT_PUBLIC_FCM_INTEGRATION_IDENTIFIER?.trim();

  if (!subscriberId) {
    res.status(400).json({ error: 'subscriberId is required' });

    return;
  }

  if (!deviceToken) {
    res.status(400).json({ error: 'deviceToken is required' });

    return;
  }

  const backendUrl = (
    process.env.NOVU_API_BASE_URL ??
    process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ??
    'https://api.novu.co'
  ).replace(/\/+$/, '');

  try {
    const upstream = await fetch(`${backendUrl}/v1/subscribers/${encodeURIComponent(subscriberId)}/credentials`, {
      method: 'PUT',
      headers: {
        Authorization: `ApiKey ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        providerId: 'fcm',
        credentials: { deviceTokens: [deviceToken] },
        ...(integrationIdentifier ? { integrationIdentifier } : {}),
      }),
    });

    const data = (await upstream.json().catch(() => ({}))) as {
      message?: string | string[];
      error?: string;
      [key: string]: unknown;
    };

    if (!upstream.ok) {
      let upstreamMessage: string | undefined;

      if (Array.isArray(data.message)) {
        upstreamMessage = data.message.join('; ');
      } else if (typeof data.message === 'string') {
        upstreamMessage = data.message;
      } else if (typeof data.error === 'string') {
        upstreamMessage = data.error;
      }

      res.status(upstream.status).json({
        error: upstreamMessage || 'Failed to register FCM token on subscriber',
        details: data,
      });

      return;
    }

    res.status(200).json({ ok: true, subscriberId, details: data });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error registering FCM token',
    });
  }
}
