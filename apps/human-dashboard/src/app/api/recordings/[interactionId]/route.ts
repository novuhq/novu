import { currentUser } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

import { AGENT_INBOX_DASHBOARD_SECRET_HEADER, NOVU_ANALYTICS_SOURCE_HEADER } from '@/lib/constants';
import { readHumanAccount } from '@/lib/human-account';
import { readApiKey } from '@/lib/human-api-key';
import { resolveNovuApiUrl } from '@/lib/novu-api';

/**
 * Streams a voice call recording for the signed-in operator. The browser never
 * holds an ApiKey, so `<audio src>` points here; this handler authenticates with
 * Clerk, then fetches the Novu recording proxy with the account secret.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ interactionId: string }> }
): Promise<Response> {
  const { interactionId } = await context.params;
  if (!interactionId || interactionId.length > 128 || /[^a-zA-Z0-9_-]/.test(interactionId)) {
    return new Response(null, { status: 404 });
  }

  const user = await currentUser();
  const account = user ? readHumanAccount(user) : null;
  if (!account) {
    return new Response(null, { status: 401 });
  }

  let secretKey: string;
  try {
    secretKey = await readApiKey(account);
  } catch (error) {
    console.error('Failed to load the account key for a recording', error);

    return new Response(null, { status: 502 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${resolveNovuApiUrl()}/v1/human/interactions/${encodeURIComponent(interactionId)}/voice/recording`,
      {
        method: 'GET',
        headers: {
          Authorization: `ApiKey ${secretKey}`,
          [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: process.env.AGENT_INBOX_DASHBOARD_API_SECRET ?? '',
          [NOVU_ANALYTICS_SOURCE_HEADER]: 'dashboard',
        },
        cache: 'no-store',
      }
    );
  } catch (error) {
    console.error('Failed to reach the Novu API for a recording', error);

    return new Response(null, { status: 502 });
  }

  if (!upstream.ok) {
    return new Response(null, { status: upstream.status === 404 ? 404 : 502 });
  }

  const contentType = upstream.headers.get('content-type') || 'audio/mpeg';

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
