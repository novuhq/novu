import type { IEnvironment } from '@novu/shared';
import { get } from '@/api/api.client';

export type NovuConnectContext = {
  context: Record<string, { id: string; data?: Record<string, unknown> }>;
  contextHash: string;
  subscriberHash: string;
};

/**
 * Fetches the server-minted tenant `context` + `contextHash`, plus a `subscriberHash` for the
 * authenticated user, signed with Novu's hosted-app environment secret. Powers the dashboard Inbox
 * HMAC and the NovuCopilot Slack connect flow, which both authenticate as the same hosted-app
 * subscriber (`<user>`). Runs in the customer's authenticated session so everything
 * is signed server-side — never forged in the browser.
 */
export async function getNovuInboxContext(
  environment: IEnvironment,
  signal?: AbortSignal
): Promise<NovuConnectContext> {
  const response = await get<{ data: NovuConnectContext } | NovuConnectContext>(`/novu/context`, {
    environment,
    signal,
  });

  return 'data' in response ? response.data : response;
}
