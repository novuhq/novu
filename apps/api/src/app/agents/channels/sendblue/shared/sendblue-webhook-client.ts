import Sendblue from 'sendblue';

const SENDBLUE_API_TIMEOUT_MS = 10_000;
const RECEIVE_WEBHOOK_TYPE = 'receive';

export type SendblueWebhookEntry = {
  url: string;
  secret?: string;
};

export interface SendblueWebhookClientCredentials {
  apiKey: string;
  secretKey: string;
}

function buildClient(credentials: SendblueWebhookClientCredentials): Sendblue {
  return new Sendblue({
    apiKey: credentials.apiKey,
    apiSecret: credentials.secretKey,
    timeout: SENDBLUE_API_TIMEOUT_MS,
    maxRetries: 0,
  });
}

/** Normalizes a `receive` webhook entry, which Sendblue returns as either a bare URL string or `{ url, secret }`. */
function normalizeWebhookEntry(entry: string | { url: string; secret?: string }): SendblueWebhookEntry {
  return typeof entry === 'string' ? { url: entry } : { url: entry.url, secret: entry.secret };
}

/**
 * Lists every `receive` webhook currently registered on the Sendblue account tied to these
 * credentials. Webhooks are account-level in Sendblue (shared across every phone number/line on
 * the account), so this reflects the full set that will fire for any inbound message — not just
 * the ones Novu itself registered.
 * @see https://docs.sendblue.com/getting-started/webhooks/
 */
export async function listSendblueReceiveWebhooks(
  credentials: SendblueWebhookClientCredentials
): Promise<SendblueWebhookEntry[]> {
  const client = buildClient(credentials);
  const response = await client.webhooks.list();

  if (response.status === 'ERROR') {
    throw new Error('Sendblue rejected the webhook list request');
  }

  const entries = response.webhooks?.receive ?? [];

  return entries.map(normalizeWebhookEntry);
}

/**
 * Registers (appends) a `receive` webhook with a per-webhook secret. Sendblue echoes the secret
 * back in the `sb-signing-secret` header on inbound deliveries. Callers that need to *replace* an
 * existing registration should delete it first via `deleteSendblueReceiveWebhooks` — Sendblue's
 * create endpoint always appends.
 */
export async function createSendblueReceiveWebhook(
  credentials: SendblueWebhookClientCredentials,
  webhook: SendblueWebhookEntry
): Promise<void> {
  const client = buildClient(credentials);

  // The SDK throws on non-2xx HTTP responses; Sendblue can additionally return
  // HTTP 200 with an in-body error status for validation failures.
  const response = await client.webhooks.create({
    webhooks: [{ url: webhook.url, secret: webhook.secret }],
    type: RECEIVE_WEBHOOK_TYPE,
  });

  if (response.status === 'ERROR') {
    throw new Error(response.message || 'Sendblue rejected the webhook registration request');
  }
}

/** Removes specific `receive` webhook URLs from the account. No-ops when `urls` is empty. */
export async function deleteSendblueReceiveWebhooks(
  credentials: SendblueWebhookClientCredentials,
  urls: string[]
): Promise<void> {
  if (urls.length === 0) {
    return;
  }

  const client = buildClient(credentials);
  const response = await client.webhooks.delete({ webhooks: urls });

  if (response.status === 'ERROR') {
    throw new Error(response.message || 'Sendblue rejected the webhook removal request');
  }
}
