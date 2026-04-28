/**
 * POST /api/msteams-dm-endpoint
 *
 * Server-side companion for the <MsTeamsLinkUser /> SDK component.
 *
 * Use this route when you already know the subscriber's AAD Object ID (e.g. from
 * your own Microsoft Entra / Azure AD directory) and want to register it directly,
 * bypassing the delegated OAuth flow that <MsTeamsLinkUser /> provides.
 *
 * Required ENV vars:
 *   NOVU_SECRET_KEY                      Novu API secret (sk_...)
 *   NOVU_API_BASE_URL                    Optional Novu API base URL
 *   NOVU_MSTEAMS_INTEGRATION_IDENTIFIER  Novu MS Teams integration identifier
 *
 * Optional ENV vars:
 *   NEXT_PUBLIC_MS_TEAMS_AAD_OBJECT_ID   Fallback AAD Object ID used when none is
 *                                        provided in the request body
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureMsTeamsUserDmEndpoint } from '@/lib/msteams-dm-endpoint-connect';

type RequestBody = {
  subscriberId?: string;
  integrationIdentifier?: string;
  aadObjectIdOverride?: string;
};

type ResponseData = { aadObjectId: string } | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });

    return;
  }

  try {
    const body = req.body as RequestBody;
    const subscriberId = typeof body.subscriberId === 'string' ? body.subscriberId.trim() : '';

    if (!subscriberId) {
      res.status(400).json({ error: 'subscriberId is required' });

      return;
    }

    const integrationIdentifier =
      (typeof body.integrationIdentifier === 'string' && body.integrationIdentifier.trim()) ||
      process.env.NOVU_MSTEAMS_INTEGRATION_IDENTIFIER;

    if (!integrationIdentifier) {
      res
        .status(400)
        .json({ error: 'integrationIdentifier is required (body or NOVU_MSTEAMS_INTEGRATION_IDENTIFIER)' });

      return;
    }

    const result = await ensureMsTeamsUserDmEndpoint({
      subscriberId,
      integrationIdentifier,
      aadObjectIdOverride: typeof body.aadObjectIdOverride === 'string' ? body.aadObjectIdOverride : undefined,
    });

    if (!result.ok) {
      res.status(422).json({ error: result.error });

      return;
    }

    res.status(200).json({ aadObjectId: result.aadObjectId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    res.status(500).json({ error: message });
  }
}
