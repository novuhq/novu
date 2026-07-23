import { ChannelEndpointByType, ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';

import { decryptApiKey, encryptApiKey } from './encrypt-provider';

/**
 * String fields inside a channel-endpoint `endpoint` document that must be
 * encrypted at rest, keyed by endpoint type. Unknown types omit an entry and
 * pass through unchanged (e.g. chat `webhook` keeps its url plaintext).
 */
const ENDPOINT_SECRET_STRING_FIELDS: Partial<Record<ChannelEndpointType, readonly string[]>> = {
  [ENDPOINT_TYPES.TOOL_WEBHOOK]: ['url'],
  [ENDPOINT_TYPES.PAGERDUTY_SERVICE]: ['routingKey'],
  [ENDPOINT_TYPES.OPSGENIE_INTEGRATION]: ['apiKey'],
};

function transformHeaderValues(
  headers: Record<string, unknown>,
  transform: (value: string) => string
): Record<string, unknown> {
  const transformed: Record<string, unknown> = {};

  for (const [headerKey, headerValue] of Object.entries(headers)) {
    if (typeof headerValue === 'string') {
      transformed[headerKey] = headerValue.length > 0 ? transform(headerValue) : headerValue;
    } else {
      // Non-string values are unexpected for TOOL_WEBHOOK headers; leave unchanged
      // so a single bad entry cannot skip encryption of the remaining string secrets.
      transformed[headerKey] = headerValue;
    }
  }

  return transformed;
}

function transformEndpoint<T extends ChannelEndpointType>(
  type: T,
  endpoint: ChannelEndpointByType[T],
  transform: (value: string) => string
): ChannelEndpointByType[T] {
  const secretFields = ENDPOINT_SECRET_STRING_FIELDS[type];
  if (!secretFields) {
    return endpoint;
  }

  const result: Record<string, unknown> = { ...(endpoint as Record<string, unknown>) };

  for (const key of secretFields) {
    const value = result[key];
    if (typeof value === 'string' && value.length > 0) {
      result[key] = transform(value);
    }
  }

  if (type === ENDPOINT_TYPES.TOOL_WEBHOOK) {
    const headers = result.headers;
    if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
      result.headers = transformHeaderValues(headers as Record<string, unknown>, transform);
    }
  }

  return result as ChannelEndpointByType[T];
}

/**
 * Encrypt secret fields inside a channel-endpoint `endpoint` document.
 *
 * Uses the same prefix-based pattern as `encryptApiKey` so calling this
 * helper on an already-encrypted record is a no-op (idempotent). Unknown
 * endpoint types pass through unchanged.
 */
export function encryptChannelEndpoint<T extends ChannelEndpointType>(
  type: T,
  endpoint: ChannelEndpointByType[T]
): ChannelEndpointByType[T] {
  return transformEndpoint(type, endpoint, encryptApiKey);
}

/**
 * Decrypt secret fields inside a channel-endpoint `endpoint` document.
 *
 * Idempotent: legacy unprefixed values pass through unchanged. Always
 * decrypt at use-time only — never persist the decrypted form back.
 */
export function decryptChannelEndpoint<T extends ChannelEndpointType>(
  type: T,
  endpoint: ChannelEndpointByType[T]
): ChannelEndpointByType[T] {
  return transformEndpoint(type, endpoint, decryptApiKey);
}
