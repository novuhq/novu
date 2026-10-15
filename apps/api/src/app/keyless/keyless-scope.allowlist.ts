import { ChatProviderIdEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';

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

/** A broadcast reaches every subscriber of the environment, so its cost is resolved against the database. */
export type KeylessTriggerCost = { type: 'recipients'; units: number } | { type: 'broadcast' };

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
  if (method.toUpperCase() !== 'POST' || normalizePath(path) !== INTEGRATIONS_PATH) {
    return true;
  }

  const providerId = (body as { providerId?: unknown } | null | undefined)?.providerId;

  return typeof providerId !== 'string' || !KEYLESS_DENIED_INTEGRATION_PROVIDER_IDS.includes(providerId.toLowerCase());
}

function recipientUnits(event: unknown): number {
  const to = (event as { to?: unknown } | null | undefined)?.to;

  return Array.isArray(to) ? to.length : 1;
}

/** Daily recipient units a trigger request costs, or `null` when the request is not a trigger. */
export function computeKeylessTriggerCost(method: string, path: string, body: unknown): KeylessTriggerCost | null {
  if (method.toUpperCase() !== 'POST') {
    return null;
  }

  const normalized = normalizePath(path);

  if (normalized === TRIGGER_PATH) {
    return { type: 'recipients', units: recipientUnits(body) };
  }

  if (normalized === BULK_TRIGGER_PATH) {
    const events = (body as { events?: unknown } | null | undefined)?.events;
    const units = Array.isArray(events) ? events.reduce<number>((total, event) => total + recipientUnits(event), 0) : 1;

    return { type: 'recipients', units };
  }

  if (normalized === BROADCAST_TRIGGER_PATH) {
    return { type: 'broadcast' };
  }

  return null;
}
