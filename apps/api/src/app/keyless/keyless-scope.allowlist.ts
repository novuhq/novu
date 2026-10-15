import { ChatProviderIdEnum, EmailProviderIdEnum, SmsProviderIdEnum, TriggerRecipientsTypeEnum } from '@novu/shared';

/**
 * Routes a keyless-organization `ApiKey` may reach, matched on the full request
 * path (including the `/v1` / `/v2` version prefix). Only resources the claim
 * carries into the claimer's account are listed, so pre-claim work is never lost.
 */
export const KEYLESS_API_KEY_ALLOWED_PATH_PREFIXES = [
  '/v1/events',
  '/v2/workflows',
  '/v1/subscribers',
  '/v2/subscribers',
  '/v1/integrations',
  '/v1/messages',
  '/v1/notifications',
  '/v1/activity',
  '/v1/execution-details',
  '/v1/keyless/environments/me',
] as const;

const KEYLESS_API_KEY_ALLOWED_GET_PATHS = ['/v1/environments/me'] as const;

/** Allowlisted routes that write into another environment of the shared organization. */
const KEYLESS_API_KEY_DENIED_PATHS = [/^\/v2\/workflows\/[^/]+\/sync$/] as const;

const INTEGRATIONS_PATH = '/v1/integrations';

/**
 * Novu-managed delivery providers send on Novu's own credentials, and trigger overrides
 * (`to` / `cc` / `bcc`) reach recipients the daily recipient cap never counts.
 */
const KEYLESS_DENIED_INTEGRATION_PROVIDER_IDS: readonly string[] = [
  EmailProviderIdEnum.Novu,
  SmsProviderIdEnum.Novu,
  ChatProviderIdEnum.Novu,
];

const TRIGGER_PATH = '/v1/events/trigger';
const BULK_TRIGGER_PATH = '/v1/events/trigger/bulk';
const BROADCAST_TRIGGER_PATH = '/v1/events/trigger/broadcast';

const RECIPIENT_OVERRIDE_KEYS: readonly string[] = ['to', 'cc', 'bcc'];
const MAX_OVERRIDES_DEPTH = 5;

type RecipientCost = { units: number; topicKeys: string[] };

/**
 * A broadcast reaches every subscriber of the environment, and a topic every subscriber of
 * the topic (Inbox sessions can subscribe any number of subscribers), so both are resolved
 * against the database.
 */
export type KeylessTriggerCost = ({ type: 'recipients' } & RecipientCost) | { type: 'broadcast' };

/** Express routing is case-insensitive and tolerates a trailing slash, so match the same way. */
function normalizePath(path: string): string {
  const lowered = path.toLowerCase();

  return lowered.length > 1 ? lowered.replace(/\/+$/, '') : lowered;
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isKeylessApiKeyRouteAllowed(method: string, path: string): boolean {
  const normalized = normalizePath(path);

  if (KEYLESS_API_KEY_DENIED_PATHS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  if (KEYLESS_API_KEY_ALLOWED_PATH_PREFIXES.some((prefix) => matchesPrefix(normalized, prefix))) {
    return true;
  }

  return method.toUpperCase() === 'GET' && KEYLESS_API_KEY_ALLOWED_GET_PATHS.some((exact) => normalized === exact);
}

export function isKeylessApiKeyRequestBodyAllowed(method: string, path: string, body: unknown): boolean {
  if (method.toUpperCase() !== 'POST') {
    return true;
  }

  const normalized = normalizePath(path);

  if (normalized === TRIGGER_PATH || normalized === BROADCAST_TRIGGER_PATH) {
    return !hasEventRecipientOverride(body);
  }

  if (normalized === BULK_TRIGGER_PATH) {
    const events = (body as { events?: unknown } | null | undefined)?.events;

    return !Array.isArray(events) || !events.some(hasEventRecipientOverride);
  }

  if (normalized !== INTEGRATIONS_PATH) {
    return true;
  }

  const providerId = (body as { providerId?: unknown } | null | undefined)?.providerId;

  return typeof providerId !== 'string' || !KEYLESS_DENIED_INTEGRATION_PROVIDER_IDS.includes(providerId.toLowerCase());
}

function hasEventRecipientOverride(event: unknown): boolean {
  return hasRecipientOverride((event as { overrides?: unknown } | null | undefined)?.overrides);
}

/**
 * Provider overrides (`email`, `<providerId>`, `providers.<id>`, `steps.<id>.providers.<id>`)
 * can add `to` / `cc` / `bcc` recipients, including on the seeded Novu Email integration.
 */
function hasRecipientOverride(value: unknown, depth = 0): boolean {
  if (!value || typeof value !== 'object' || depth > MAX_OVERRIDES_DEPTH) {
    return false;
  }

  return Object.entries(value).some(
    ([key, nested]) => RECIPIENT_OVERRIDE_KEYS.includes(key.toLowerCase()) || hasRecipientOverride(nested, depth + 1)
  );
}

function topicKeyOf(recipient: unknown): string | null {
  const { type, topicKey } = (recipient ?? {}) as { type?: unknown; topicKey?: unknown };

  return type === TriggerRecipientsTypeEnum.TOPIC && typeof topicKey === 'string' ? topicKey : null;
}

function addRecipientCost(cost: RecipientCost, event: unknown): void {
  const to = (event as { to?: unknown } | null | undefined)?.to;
  const recipients = Array.isArray(to) ? to : [to];

  for (const recipient of recipients) {
    const topicKey = topicKeyOf(recipient);

    if (topicKey === null) {
      cost.units += 1;
    } else {
      cost.topicKeys.push(topicKey);
    }
  }
}

/** Daily recipient units a trigger request costs, or `null` when the request is not a trigger. */
export function computeKeylessTriggerCost(method: string, path: string, body: unknown): KeylessTriggerCost | null {
  if (method.toUpperCase() !== 'POST') {
    return null;
  }

  const normalized = normalizePath(path);

  if (normalized === TRIGGER_PATH) {
    const cost: RecipientCost = { units: 0, topicKeys: [] };
    addRecipientCost(cost, body);

    return { type: 'recipients', ...cost };
  }

  if (normalized === BULK_TRIGGER_PATH) {
    const events = (body as { events?: unknown } | null | undefined)?.events;

    if (!Array.isArray(events)) {
      return { type: 'recipients', units: 1, topicKeys: [] };
    }

    const cost: RecipientCost = { units: 0, topicKeys: [] };

    for (const event of events) {
      addRecipientCost(cost, event);
    }

    return { type: 'recipients', ...cost };
  }

  if (normalized === BROADCAST_TRIGGER_PATH) {
    return { type: 'broadcast' };
  }

  return null;
}
