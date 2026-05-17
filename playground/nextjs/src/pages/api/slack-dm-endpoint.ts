/**
 * POST /api/slack-dm-endpoint
 *
 * Server-side companion for the `LinkUser` SDK component.
 *
 * This route implements the email → Slack user ID resolution that cannot run in the
 * browser (requires the SLACK_BOT_USER_OAUTH_TOKEN bot secret). After this route
 * succeeds, Novu has a `slack_user` ChannelEndpoint and can send DMs to the subscriber.
 *
 * The `LinkUser` SDK component handles the ChannelEndpoint creation client-side when
 * you already know the Slack user ID. Use this route when you need to resolve the
 * Slack user ID server-side from a subscriber email.
 *
 * Required ENV vars:
 *   NOVU_SECRET_KEY                    Novu API secret (sk_...)
 *   NOVU_API_BASE_URL                  Optional Novu API base URL
 *   NOVU_SLACK_INTEGRATION_IDENTIFIER  Novu Slack integration identifier
 *   SLACK_BOT_USER_OAUTH_TOKEN         Slack workspace Bot User OAuth Token (xoxb-...)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureSlackUserDmEndpoint } from '@/lib/slack-dm-endpoint-connect';

type RequestBody = {
  subscriberId?: string;
  integrationIdentifier?: string;
  emailOverride?: string;
  slackUserIdOverride?: string;
};

type ResponseData = { slackUserId: string } | { error: string };

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
      process.env.NOVU_SLACK_INTEGRATION_IDENTIFIER;

    if (!integrationIdentifier) {
      res.status(400).json({ error: 'integrationIdentifier is required (body or NOVU_SLACK_INTEGRATION_IDENTIFIER)' });

      return;
    }

    const result = await ensureSlackUserDmEndpoint({
      subscriberId,
      integrationIdentifier,
      emailOverride: typeof body.emailOverride === 'string' ? body.emailOverride : undefined,
      slackUserIdOverride: typeof body.slackUserIdOverride === 'string' ? body.slackUserIdOverride : undefined,
    });

    if (!result.ok) {
      res.status(422).json({ error: result.error });

      return;
    }

    res.status(200).json({ slackUserId: result.slackUserId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    res.status(500).json({ error: message });
  }
}
