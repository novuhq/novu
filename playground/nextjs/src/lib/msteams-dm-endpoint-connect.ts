/**
 * Server-side helper for registering an MS Teams DM channel endpoint in Novu.
 *
 * WHY THIS MUST BE SERVER-SIDE
 * Creating a ChannelEndpoint requires the Novu secret key (sk_...) which must
 * never be exposed to the browser. Use this from a Next.js API route or any
 * server-side handler.
 *
 * FULL FLOW
 * 1. IT admin completes the MS Teams admin consent flow in the Novu Dashboard →
 *    stores a ChannelConnection for the tenant.
 * 2. Individual users link their identity via <MsTeamsLinkUser /> (delegated OAuth)
 *    OR your backend uses `ensureMsTeamsUserDmEndpoint` with a known AAD Object ID.
 * 3. Novu uses the registered ms_teams_user ChannelEndpoint to send direct messages
 *    via the MS Teams Bot Framework.
 *
 * REQUIRED ENV VARS
 *   NOVU_SECRET_KEY                        Novu API secret key (sk_...)
 *   NOVU_API_BASE_URL                      Novu API base URL (optional; falls back to NEXT_PUBLIC_NOVU_BACKEND_URL, then https://api.novu.co)
 *   NOVU_MSTEAMS_INTEGRATION_IDENTIFIER    Novu integration identifier for the MS Teams integration
 *   NEXT_PUBLIC_MS_TEAMS_AAD_OBJECT_ID     Fallback AAD Object ID for testing (public, optional)
 */

import { Novu } from '@novu/api';

const MS_TEAMS_USER_TYPE = 'ms_teams_user' as const;

export type EnsureMsTeamsUserDmEndpointResult = { ok: true; aadObjectId: string } | { ok: false; error: string };

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

  return new Novu({ security: { secretKey }, serverURL });
}

/**
 * Register an MS Teams DM ChannelEndpoint for a subscriber using their AAD Object ID.
 *
 * Idempotent: if an endpoint with this AAD Object ID already exists, returns immediately.
 *
 * The AAD Object ID (`oid`) is available from:
 *   - The <MsTeamsLinkUser /> delegated OAuth flow (automatic)
 *   - Your own Microsoft Entra / Azure AD directory
 *   - The Microsoft Graph API (`GET /v1.0/users/{email}` → `.id`)
 *
 * @param subscriberId          The Novu subscriber ID
 * @param integrationIdentifier The Novu MS Teams integration identifier
 * @param aadObjectIdOverride   The subscriber's AAD Object ID (falls back to NEXT_PUBLIC_MS_TEAMS_AAD_OBJECT_ID)
 */
export async function ensureMsTeamsUserDmEndpoint(args: {
  subscriberId: string;
  integrationIdentifier: string;
  aadObjectIdOverride?: string;
}): Promise<EnsureMsTeamsUserDmEndpointResult> {
  const novu = getNovuClient();
  const { subscriberId, integrationIdentifier } = args;

  const aadObjectId = args.aadObjectIdOverride?.trim() || process.env.NEXT_PUBLIC_MS_TEAMS_AAD_OBJECT_ID?.trim() || '';

  if (!aadObjectId) {
    return {
      ok: false,
      error:
        'AAD Object ID is required. Pass aadObjectIdOverride or set NEXT_PUBLIC_MS_TEAMS_AAD_OBJECT_ID.' +
        ' You can find the AAD Object ID in Microsoft Entra admin center or via <MsTeamsLinkUser /> OAuth.',
    };
  }

  const endpoints = await novu.channelEndpoints.list({
    subscriberId,
    integrationIdentifier,
    limit: 100,
  });

  const alreadyLinked = endpoints.result.data.some((ep) => {
    const endpointData = ep.endpoint as Record<string, string>;

    return ep.type === MS_TEAMS_USER_TYPE && endpointData.userId === aadObjectId;
  });

  if (alreadyLinked) {
    return { ok: true, aadObjectId };
  }

  const connections = await novu.channelConnections.list({
    subscriberId,
    integrationIdentifier,
    limit: 100,
  });

  const connectionIdentifier = connections.result.data.find(
    (c) => c.identifier && c.providerId === 'msteams'
  )?.identifier;

  if (!connectionIdentifier) {
    return {
      ok: false,
      error:
        'No MS Teams channel connection found for this subscriber. ' +
        'An IT admin must complete the admin consent flow in the Novu Dashboard first.',
    };
  }

  try {
    await novu.channelEndpoints.create({
      subscriberId,
      integrationIdentifier,
      connectionIdentifier,
      type: MS_TEAMS_USER_TYPE,
      endpoint: { userId: aadObjectId },
    });

    return { ok: true, aadObjectId };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'channelEndpoints.create failed';

    return { ok: false, error: message };
  }
}
