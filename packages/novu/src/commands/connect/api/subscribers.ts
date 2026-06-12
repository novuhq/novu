import type { ConnectApiClient } from './client';

export interface UpsertSubscriberInput {
  subscriberId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

/**
 * `POST /v2/subscribers` upserts by default — if the subscriberId exists the
 * record is updated, otherwise it is created. We need this to seed a real
 * subscriber before generating a Slack OAuth URL in `subscriber` mode; without
 * one the chat-oauth callback would have nothing to attach the SLACK_USER
 * channel endpoint to, and `welcome-message` would silently no-op.
 */
export async function upsertSubscriber(client: ConnectApiClient, input: UpsertSubscriberInput): Promise<void> {
  await client.axios.post('/v2/subscribers', {
    subscriberId: input.subscriberId,
    firstName: input.firstName ?? undefined,
    lastName: input.lastName ?? undefined,
    email: input.email ?? undefined,
  });
}
