import { ChannelEndpointByType, ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';

import { decryptApiKey, encryptApiKey } from './encrypt-provider';

function transformStringField(value: unknown, transform: (value: string) => string): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return value as string | undefined;
  }

  return transform(value);
}

function transformHeaderValues(
  headers: Record<string, string>,
  transform: (value: string) => string
): Record<string, string> {
  const transformed: Record<string, string> = {};

  for (const [headerKey, headerValue] of Object.entries(headers)) {
    transformed[headerKey] = headerValue.length > 0 ? transform(headerValue) : headerValue;
  }

  return transformed;
}

function transformToolWebhookEndpoint(
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.TOOL_WEBHOOK],
  transform: (value: string) => string
): ChannelEndpointByType[typeof ENDPOINT_TYPES.TOOL_WEBHOOK] {
  const result = { ...endpoint };
  const url = transformStringField(result.url, transform);
  if (url !== undefined) {
    result.url = url;
  }

  if (result.headers) {
    result.headers = transformHeaderValues(result.headers, transform);
  }

  return result;
}

function transformPagerDutyEndpoint(
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.PAGERDUTY_SERVICE],
  transform: (value: string) => string
): ChannelEndpointByType[typeof ENDPOINT_TYPES.PAGERDUTY_SERVICE] {
  const result = { ...endpoint };
  const routingKey = transformStringField(result.routingKey, transform);
  if (routingKey !== undefined) {
    result.routingKey = routingKey;
  }

  return result;
}

function transformOpsgenieEndpoint(
  endpoint: ChannelEndpointByType[typeof ENDPOINT_TYPES.OPSGENIE_INTEGRATION],
  transform: (value: string) => string
): ChannelEndpointByType[typeof ENDPOINT_TYPES.OPSGENIE_INTEGRATION] {
  const result = { ...endpoint };
  const apiKey = transformStringField(result.apiKey, transform);
  if (apiKey !== undefined) {
    result.apiKey = apiKey;
  }

  return result;
}

function transformEndpoint<T extends ChannelEndpointType>(
  type: T,
  endpoint: ChannelEndpointByType[T],
  transform: (value: string) => string
): ChannelEndpointByType[T] {
  switch (type) {
    case ENDPOINT_TYPES.TOOL_WEBHOOK:
      return transformToolWebhookEndpoint(
        endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.TOOL_WEBHOOK],
        transform
      ) as ChannelEndpointByType[T];
    case ENDPOINT_TYPES.PAGERDUTY_SERVICE:
      return transformPagerDutyEndpoint(
        endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.PAGERDUTY_SERVICE],
        transform
      ) as ChannelEndpointByType[T];
    case ENDPOINT_TYPES.OPSGENIE_INTEGRATION:
      return transformOpsgenieEndpoint(
        endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.OPSGENIE_INTEGRATION],
        transform
      ) as ChannelEndpointByType[T];
    default:
      return endpoint;
  }
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
