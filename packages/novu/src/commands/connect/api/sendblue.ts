import type { ConnectApiClient } from './client';

export interface ConfigureSendblueWebhookResult {
  success: boolean;
  callbackUrl: string;
  webhookSecret?: string;
  fallbackToManual?: boolean;
  reason?: { code: string; message: string };
  /** Other Novu agent webhook URLs already registered on this Sendblue account. */
  existingNovuWebhookUrls?: string[];
}

export interface RemoveSendblueWebhooksResult {
  success: boolean;
  removedWebhookUrls: string[];
  message?: string;
}

export interface SendSendblueTestMessageResult {
  success: boolean;
  messageId?: string;
  error?: { code: string; message: string };
}

function agentSendbluePath(agentIdentifier: string, integrationIdentifier: string, action: string): string {
  return `/v1/agents/${encodeURIComponent(agentIdentifier)}/integrations/${encodeURIComponent(
    integrationIdentifier
  )}/sendblue/${action}`;
}

/**
 * Provisions a webhook signing secret and registers the agent inbound URL as a
 * `receive` webhook on the Sendblue account. Returns `fallbackToManual: true`
 * (with the callback URL + secret) when the Sendblue API rejects the auto
 * registration.
 */
export async function configureSendblueWebhook(
  client: ConnectApiClient,
  agentIdentifier: string,
  integrationIdentifier: string
): Promise<ConfigureSendblueWebhookResult> {
  const res = await client.axios.post<{ data?: ConfigureSendblueWebhookResult } | ConfigureSendblueWebhookResult>(
    agentSendbluePath(agentIdentifier, integrationIdentifier, 'configure-webhook'),
    {}
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as ConfigureSendblueWebhookResult);
}

/** Removes stale Novu-shaped `receive` webhook URLs from the Sendblue account. */
export async function removeSendblueWebhooks(
  client: ConnectApiClient,
  agentIdentifier: string,
  integrationIdentifier: string,
  webhookUrls: string[]
): Promise<RemoveSendblueWebhooksResult> {
  const res = await client.axios.post<{ data?: RemoveSendblueWebhooksResult } | RemoveSendblueWebhooksResult>(
    agentSendbluePath(agentIdentifier, integrationIdentifier, 'remove-webhooks'),
    { webhookUrls }
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as RemoveSendblueWebhooksResult);
}

/**
 * Sends a plain-text welcome message via the configured Sendblue number to the
 * recipient stored on `subscriber.phone`. On Sendblue's free/shared lines the
 * recipient must text the number first, surfaced as `error.code === 'recipient_not_verified'`.
 */
export async function sendSendblueTestMessage(
  client: ConnectApiClient,
  agentIdentifier: string,
  integrationIdentifier: string,
  subscriberId: string
): Promise<SendSendblueTestMessageResult> {
  const res = await client.axios.post<{ data?: SendSendblueTestMessageResult } | SendSendblueTestMessageResult>(
    agentSendbluePath(agentIdentifier, integrationIdentifier, 'test-message'),
    { subscriberId }
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as SendSendblueTestMessageResult);
}
