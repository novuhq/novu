/**
 * Server-side helper for registering a Slack DM channel endpoint in Novu.
 *
 * WHY THIS MUST BE SERVER-SIDE
 * The Slack `users.lookupByEmail` API requires a Bot User OAuth Token (xoxb-...).
 * That token must never be exposed to the browser. Use this from a Next.js API route
 * or any server-side handler.
 *
 * FULL FLOW
 * 1. User clicks `ConnectChat` → Novu OAuth stores a ChannelConnection for the subscriber.
 * 2. Your backend (this helper) resolves the subscriber email → Slack user ID via
 *    `users.lookupByEmail` using the workspace bot token.
 * 3. `ensureSlackUserDmEndpoint` creates a `slack_user` ChannelEndpoint so Novu can
 *    send Slack DMs to the subscriber's personal account.
 *
 * REQUIRED ENV VARS
 *   NOVU_SECRET_KEY                    Novu API secret key (sk_...)
 *   NOVU_API_BASE_URL                  Novu API base URL (optional; falls back to NEXT_PUBLIC_NOVU_BACKEND_URL, then https://api.novu.co)
 *   NOVU_SLACK_INTEGRATION_IDENTIFIER  Novu integration identifier for the Slack integration
 *   SLACK_BOT_USER_OAUTH_TOKEN         Slack workspace Bot User OAuth Token (xoxb-...)
 */

import { Novu } from '@novu/api';

const SLACK_LOOKUP_BY_EMAIL_URL = 'https://slack.com/api/users.lookupByEmail';
const SLACK_USER_TYPE = 'slack_user' as const;

export type EnsureSlackUserDmEndpointResult = { ok: true; slackUserId: string } | { ok: false; error: string };

function getNovuClient(): Novu {
  const secretKey = process.env.NOVU_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error('NOVU_SECRET_KEY is required');
  }

  const serverURL = (
    process.env.NOVU_API_BASE_URL ??
    process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ??
    'https://api.novu.co'
  ).replace(/\/v1$/, '');

  // Workspace `@novu/api` (internal SDK) resolves auth from `security`, not top-level `secretKey`.
  return new Novu({ security: { secretKey }, serverURL });
}

/**
 * Resolve a Slack user ID from an email address using the workspace bot token.
 * Returns undefined when the lookup fails or the user cannot be found.
 */
export async function lookupSlackUserIdByEmail(botAccessToken: string, email: string): Promise<string | undefined> {
  try {
    const res = await fetch(SLACK_LOOKUP_BY_EMAIL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botAccessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ email: email.trim().toLowerCase() }),
    });

    const data = (await res.json()) as { ok?: boolean; user?: { id?: string } };

    if (data?.ok !== true || !data?.user?.id) {
      return undefined;
    }

    return data.user.id;
  } catch {
    return undefined;
  }
}

/**
 * After a subscriber completes Novu Slack OAuth (`ConnectChat`), call this server-side
 * function to register a `slack_user` ChannelEndpoint so Novu can send Slack DMs.
 *
 * Idempotent: if an endpoint for this slackUserId already exists, returns immediately.
 *
 * @param subscriberId          The Novu subscriber ID
 * @param integrationIdentifier The Novu Slack integration identifier
 * @param emailOverride         Use this email instead of the subscriber profile email
 * @param slackUserIdOverride   Skip the Slack API lookup and use this Slack user ID directly
 */
export async function ensureSlackUserDmEndpoint(args: {
  subscriberId: string;
  integrationIdentifier: string;
  emailOverride?: string;
  slackUserIdOverride?: string;
}): Promise<EnsureSlackUserDmEndpointResult> {
  const novu = getNovuClient();
  const { subscriberId, integrationIdentifier } = args;

  let slackUserId = args.slackUserIdOverride?.trim();

  if (!slackUserId) {
    const subRes = await novu.subscribers.retrieve(subscriberId);
    const profileEmail =
      args.emailOverride?.trim() || (typeof subRes.result?.email === 'string' ? subRes.result.email.trim() : '');

    const botToken = (process.env.SLACK_BOT_USER_OAUTH_TOKEN ?? '').trim();

    if (!profileEmail) {
      return {
        ok: false,
        error: 'Subscriber has no email. Pass email when creating the subscriber or provide emailOverride.',
      };
    }

    if (!botToken) {
      return {
        ok: false,
        error: 'Missing workspace bot token. Set SLACK_BOT_USER_OAUTH_TOKEN (Bot User OAuth Token from the Slack app).',
      };
    }

    slackUserId = await lookupSlackUserIdByEmail(botToken, profileEmail);

    if (!slackUserId) {
      return {
        ok: false,
        error:
          'Could not resolve Slack user ID via users.lookupByEmail. Use an email that matches a Slack account, or pass slackUserIdOverride.',
      };
    }
  }

  const endpoints = await novu.channelEndpoints.list({
    subscriberId,
    integrationIdentifier,
    limit: 100,
  });

  const alreadyLinked = endpoints.result.data.some((ep) => {
    const endpointData = ep.endpoint as Record<string, string>;

    return ep.type === SLACK_USER_TYPE && endpointData.userId === slackUserId;
  });

  if (alreadyLinked) {
    return { ok: true, slackUserId };
  }

  const connections = await novu.channelConnections.list({
    subscriberId,
    integrationIdentifier,
    limit: 100,
  });

  const connectionIdentifier = connections.result.data.find(
    (c) => c.identifier && c.providerId === 'slack'
  )?.identifier;

  if (!connectionIdentifier) {
    return {
      ok: false,
      error:
        'No Slack channel connection found for this subscriber. The subscriber must complete ConnectChat OAuth first.',
    };
  }

  try {
    await novu.channelEndpoints.create({
      subscriberId,
      integrationIdentifier,
      connectionIdentifier,
      type: SLACK_USER_TYPE,
      endpoint: { userId: slackUserId },
    });

    return { ok: true, slackUserId };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'channelEndpoints.create failed';

    return { ok: false, error: message };
  }
}
