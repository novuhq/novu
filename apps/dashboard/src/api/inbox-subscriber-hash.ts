import type { IEnvironment } from '@novu/shared';
import { get } from '@/api/api.client';

export type InboxSubscriberHash = {
  subscriberHash: string;
};

/**
 * Fetches a server-minted `subscriberHash` for a dashboard-owned subscriber identity,
 * signed with the current environment API key. Required when the environment's In-App
 * integration has HMAC enabled (agent Slack/Teams connect and the web-chat tester).
 */
export async function getInboxSubscriberHash(
  environment: IEnvironment,
  subscriberId: string,
  signal?: AbortSignal
): Promise<InboxSubscriberHash> {
  const response = await get<{ data: InboxSubscriberHash } | InboxSubscriberHash>(
    `/environments/me/inbox-subscriber-hash?subscriberId=${encodeURIComponent(subscriberId)}`,
    {
      environment,
      signal,
    }
  );

  return 'data' in response ? response.data : response;
}
