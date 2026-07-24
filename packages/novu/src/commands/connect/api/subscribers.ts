import type { ConnectApiClient } from './client';

export interface UpsertSubscriberInput {
  subscriberId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  /** Persisted so the Sendblue test-message endpoint (which reads `subscriber.phone`) can reach the recipient. */
  phone?: string | null;
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
    phone: input.phone ?? undefined,
  });
}

/**
 * Best-effort read of a subscriber's saved phone so the Sendblue test-message
 * step can pre-fill the recipient input. `GET /v2/subscribers/:id` is not
 * keyless-accessible, so this resolves to `undefined` in keyless mode (where a
 * freshly-seeded subscriber has no phone anyway) — never throwing.
 */
export async function getSubscriberPhone(client: ConnectApiClient, subscriberId: string): Promise<string | undefined> {
  try {
    const res = await client.axios.get<{ data?: { phone?: string } } | { phone?: string }>(
      `/v2/subscribers/${encodeURIComponent(subscriberId)}`
    );
    const body = res.data;
    const subscriber = 'data' in body && body.data ? body.data : (body as { phone?: string });
    const phone = typeof subscriber.phone === 'string' ? subscriber.phone.trim() : '';

    return phone || undefined;
  } catch {
    return undefined;
  }
}
