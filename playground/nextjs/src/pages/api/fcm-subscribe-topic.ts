/**
 * POST /api/fcm-subscribe-topic
 *
 * Subscribes an FCM web registration token to a topic via the Instance ID API.
 * Requires the same Firebase service account Novu uses for FCM:
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID (or FIREBASE_PROJECT_ID)
 */

import { createSign } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { FCM_TOPIC_NEWS_UPDATES } from '@/lib/fcm-web';

type RequestBody = {
  deviceToken?: string;
  topic?: string;
};

type ResponseData = Record<string, unknown>;

function getPrivateKey(): string | undefined {
  const raw = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (!raw) {
    return undefined;
  }

  return raw.replace(/\\n/g, '\n');
}

function base64Url(input: Buffer | string): string {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input;

  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claimSet}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(privateKey);
  const jwt = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = (await response.json()) as { access_token?: string; error?: string; error_description?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to obtain Google access token');
  }

  return data.access_token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });

    return;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = getPrivateKey();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();

  if (!clientEmail || !privateKey || !projectId) {
    res.status(500).json({
      error:
        'Missing FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (and project id). Add the Firebase service account used by Novu FCM — see .env.example.',
    });

    return;
  }

  const body = req.body as RequestBody;
  const deviceToken = body.deviceToken?.trim();
  const topic = (body.topic?.trim() || FCM_TOPIC_NEWS_UPDATES).replace(/^\/topics\//, '');

  if (!deviceToken) {
    res.status(400).json({ error: 'deviceToken is required' });

    return;
  }

  if (!topic) {
    res.status(400).json({ error: 'topic is required' });

    return;
  }

  try {
    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
    const upstream = await fetch('https://iid.googleapis.com/iid/v1:batchAdd', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        access_token_auth: 'true',
      },
      body: JSON.stringify({
        to: `/topics/${topic}`,
        registration_tokens: [deviceToken],
      }),
    });
    const data = (await upstream.json().catch(() => ({}))) as {
      error?: string;
      results?: Array<{ error?: string }>;
      [key: string]: unknown;
    };

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: data.error || `Topic subscribe failed (${upstream.status})`,
        details: data,
        topic,
        projectId,
      });

      return;
    }

    const tokenError = data.results?.find((result) => result.error)?.error;

    if (tokenError) {
      res.status(400).json({
        error: tokenError,
        details: data,
        topic,
      });

      return;
    }

    res.status(200).json({ ok: true, topic, projectId, details: data });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error subscribing to FCM topic',
    });
  }
}
