import { createHash } from 'node:crypto';
import { ApiAuthSchemeEnum } from '@novu/shared';

/**
 * What the `API_KEY_REVOCATION_POLICY` flag does to secret keys created before its cutoff. Keys created at or after
 * the cutoff are never limited.
 */
export enum ApiKeyRevocationModeEnum {
  /** Nothing changes. Also what a missing or invalid flag value means. */
  OFF = 'off',
  /** Every call still works, and the dashboard asks for the key to be replaced. */
  WARN = 'warn',
  /**
   * Only the allowed routes keep working (the event trigger and agent reply routes by default). Every other call is
   * rejected.
   */
  BLOCK_EXCEPT_ALLOWED = 'block_except_allowed',
  /** Every call is rejected, and the key no longer signs subscriber and context hashes. */
  BLOCK_ALL = 'block_all',
}

/**
 * What a key limited by `block_except_allowed` can still do when the flag lists no routes: send and cancel events,
 * and reply as an agent. Agents built with `@novu/framework` call the agent routes with the same secret key, so
 * without them those agents would stop answering.
 */
export const DEFAULT_ALLOWED_ROUTES: readonly string[] = [
  'POST /v1/events/trigger',
  'POST /v1/events/trigger/bulk',
  'POST /v1/events/trigger/broadcast',
  'DELETE /v1/events/trigger/:transactionId',
  'POST /v1/agents/events/ingest',
  // Deprecated, still used by older `@novu/framework` versions and `sendReply` SDK clients.
  'POST /v1/agents/:agentId/reply',
];

type ActiveMode = Exclude<ApiKeyRevocationModeEnum, ApiKeyRevocationModeEnum.OFF>;

export type ApiKeyRevocationPolicy =
  | { mode: ApiKeyRevocationModeEnum.OFF }
  | { mode: ActiveMode; keysCreatedBefore: Date; allowedRoutes: ReadonlySet<string> };

export const OFF_POLICY: ApiKeyRevocationPolicy = { mode: ApiKeyRevocationModeEnum.OFF };

export type ParsedApiKeyRevocationPolicy = {
  policy: ApiKeyRevocationPolicy;
  /** Why the flag value was ignored, in whole or in part. */
  problems: string[];
};

const MODES: ReadonlySet<string> = new Set(Object.values(ApiKeyRevocationModeEnum));
const ROUTE_ENTRY = /^([A-Za-z]+)\s+(\/\S*)$/;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
// `YYYY-MM-DDTHH:mm`, optional seconds and milliseconds, always in UTC.
const UTC_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?Z$/;
const API_KEY_HEADER_PREFIX = `${ApiAuthSchemeEnum.API_KEY} `;

export const REVOKED_API_KEY_MESSAGE =
  'This secret key was revoked. Generate a new secret key on the API Keys page of the Novu dashboard and update your application.';
export const TRIGGER_ONLY_API_KEY_MESSAGE =
  'This secret key was revoked and can only trigger workflows and send agent replies until you replace it. Generate a new secret key on the API Keys page of the Novu dashboard and update your application.';

/**
 * Reads the flag value: a JSON object, or a string holding one (LaunchDarkly string flags and environment variables).
 * Anything unusable turns the policy off and says why, so a typo never blocks keys nobody meant to block.
 */
export function parseApiKeyRevocationPolicy(raw: unknown, now: Date = new Date()): ParsedApiKeyRevocationPolicy {
  const flagObject = readFlagObject(raw);

  if ('problem' in flagObject) {
    return turnedOff(flagObject.problem);
  }

  if (!flagObject.value) {
    return { policy: OFF_POLICY, problems: [] };
  }

  const { mode, keysCreatedBefore, allowedRoutes } = flagObject.value;

  if (typeof mode !== 'string' || !MODES.has(mode)) {
    return turnedOff(`"mode" must be one of: ${[...MODES].join(', ')}`);
  }

  if (mode === ApiKeyRevocationModeEnum.OFF) {
    return { policy: OFF_POLICY, problems: [] };
  }

  const cutoff = readCutoff(keysCreatedBefore, now);

  if ('problem' in cutoff) {
    return turnedOff(cutoff.problem);
  }

  const problems: string[] = [];

  return {
    policy: {
      mode: mode as ActiveMode,
      keysCreatedBefore: cutoff.value,
      allowedRoutes: readAllowedRoutes(allowedRoutes, problems),
    },
    problems,
  };
}

/**
 * The creation time stored in a key's `_id` (an ObjectId, or its hex string once mapped to an entity). `null` when
 * the key has no usable id, which only keys written outside Mongoose can lack.
 */
export function getApiKeyCreatedAt(apiKeyId: unknown): Date | null {
  const hex = apiKeyId === undefined || apiKeyId === null ? '' : String(apiKeyId);

  if (!OBJECT_ID.test(hex)) {
    return null;
  }

  return new Date(Number.parseInt(hex.slice(0, 8), 16) * 1000);
}

/** A key with no known creation time counts as created before the cutoff. */
export function requiresRotation(policy: ApiKeyRevocationPolicy, keyCreatedAt: Date | null): boolean {
  if (policy.mode === ApiKeyRevocationModeEnum.OFF) {
    return false;
  }

  return keyCreatedAt === null || keyCreatedAt.getTime() < policy.keysCreatedBefore.getTime();
}

/**
 * Whether a key's signatures still count: the subscriber and context hashes behind Inbox and notification center
 * sessions, chat connect links and web chat. These never send the key itself, so the route check cannot see them.
 * Only `block_all` takes signing away from keys created before the cutoff; the other modes keep end users' inboxes
 * working until the key is replaced.
 */
export function canSignWithApiKey(policy: ApiKeyRevocationPolicy, keyCreatedAt: Date | null): boolean {
  return policy.mode !== ApiKeyRevocationModeEnum.BLOCK_ALL || !requiresRotation(policy, keyCreatedAt);
}

export function evaluateApiKeyRequest(
  policy: ApiKeyRevocationPolicy,
  keyCreatedAt: Date | null,
  method: string,
  routePath: string
): { requiresRotation: boolean; blocked: boolean } {
  if (policy.mode === ApiKeyRevocationModeEnum.OFF || !requiresRotation(policy, keyCreatedAt)) {
    return { requiresRotation: false, blocked: false };
  }

  if (policy.mode === ApiKeyRevocationModeEnum.WARN) {
    return { requiresRotation: true, blocked: false };
  }

  if (policy.mode === ApiKeyRevocationModeEnum.BLOCK_EXCEPT_ALLOWED) {
    return {
      requiresRotation: true,
      blocked: !policy.allowedRoutes.has(`${method.toUpperCase()} ${normalizeRoutePath(routePath)}`),
    };
  }

  // `block_all`, and any mode added later until it is handled here.
  return { requiresRotation: true, blocked: true };
}

export function getRevokedApiKeyMessage(policy: ApiKeyRevocationPolicy): string {
  return policy.mode === ApiKeyRevocationModeEnum.BLOCK_EXCEPT_ALLOWED && policy.allowedRoutes.size > 0
    ? TRIGGER_ONLY_API_KEY_MESSAGE
    : REVOKED_API_KEY_MESSAGE;
}

/** The hash the key is stored under, read the way the API key strategy reads `Authorization: ApiKey <key>`. */
export function hashApiKeyFromHeader(authorization: unknown): string | null {
  if (typeof authorization !== 'string' || !authorization.startsWith(API_KEY_HEADER_PREFIX)) {
    return null;
  }

  const apiKey = authorization.slice(API_KEY_HEADER_PREFIX.length);

  return apiKey ? createHash('sha256').update(apiKey).digest('hex') : null;
}

/**
 * Drops anything before the version segment (an API context path such as `/api`) and a trailing slash, so
 * `/api/v1/events/trigger/` and `/v1/events/trigger` compare equal.
 */
export function normalizeRoutePath(path: string): string {
  const versionIndex = path.search(/\/v\d+(\/|$)/);
  const fromVersion = versionIndex > 0 ? path.slice(versionIndex) : path;

  return fromVersion.length > 1 && fromVersion.endsWith('/') ? fromVersion.slice(0, -1) : fromVersion;
}

type Read<T> = { value: T } | { problem: string };

/** `null` for an empty value, which means the policy is off. */
function readFlagObject(raw: unknown): Read<Record<string, unknown> | null> {
  if (raw === undefined || raw === null || raw === '') {
    return { value: null };
  }

  let value: unknown = raw;

  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return { problem: 'the value is not valid JSON' };
    }
  }

  return isRecord(value) ? { value } : { problem: 'the value is not a JSON object' };
}

function readCutoff(keysCreatedBefore: unknown, now: Date): Read<Date> {
  const cutoff = parseUtcDateTime(keysCreatedBefore);

  if (!cutoff) {
    return { problem: '"keysCreatedBefore" must be a UTC date and time, such as "2026-11-19T13:00:00.000Z"' };
  }

  // A cutoff still ahead would also limit the new keys created to replace the old ones.
  if (cutoff.getTime() > now.getTime()) {
    return { problem: `"keysCreatedBefore" (${cutoff.toISOString()}) is in the future` };
  }

  return { value: cutoff };
}

/**
 * `null` unless the value is a UTC date and time that exists. `new Date` rolls impossible days over instead of
 * rejecting them (February 30 becomes March 2), so the parsed parts have to match the written ones.
 */
function parseUtcDateTime(value: unknown): Date | null {
  const match = typeof value === 'string' ? UTC_DATE_TIME.exec(value) : null;

  if (!match) {
    return null;
  }

  const [text, year, month, day, hour, minute, second = '0'] = match;
  const date = new Date(text);
  const written = [year, month, day, hour, minute, second].map(Number);
  const parsed = [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ];

  return parsed.every((part, index) => part === written[index]) ? date : null;
}

/** The default routes when none are listed. Entries it cannot read are skipped and reported. */
function readAllowedRoutes(allowedRoutes: unknown, problems: string[]): ReadonlySet<string> {
  if (allowedRoutes === undefined) {
    return new Set(DEFAULT_ALLOWED_ROUTES);
  }

  if (!Array.isArray(allowedRoutes)) {
    problems.push('"allowedRoutes" must be an array of "METHOD /path" strings, using the default routes');

    return new Set(DEFAULT_ALLOWED_ROUTES);
  }

  const routes = new Set<string>();

  for (const entry of allowedRoutes) {
    const normalized = typeof entry === 'string' ? normalizeRouteEntry(entry) : null;

    if (normalized) {
      routes.add(normalized);
    } else {
      problems.push(`ignored allowed route ${JSON.stringify(entry)}, expected "METHOD /path"`);
    }
  }

  return routes;
}

function normalizeRouteEntry(entry: string): string | null {
  const match = ROUTE_ENTRY.exec(entry.trim());

  if (!match) {
    return null;
  }

  return `${match[1].toUpperCase()} ${normalizeRoutePath(match[2])}`;
}

function turnedOff(problem: string): ParsedApiKeyRevocationPolicy {
  return { policy: OFF_POLICY, problems: [`${problem}, so the policy is off`] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
