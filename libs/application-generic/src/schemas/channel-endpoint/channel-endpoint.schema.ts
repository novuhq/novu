import { BadRequestException } from '@nestjs/common';
import { ChannelEndpointType, ENDPOINT_TYPES, isValidOpsgenieApiKey } from '@novu/shared';

// Centralized schema definition
export const CHANNEL_ENDPOINT_SCHEMAS = {
  [ENDPOINT_TYPES.SLACK_CHANNEL]: {
    description: 'Slack Channel Endpoint',
    properties: { channelId: { type: 'string' as const } },
    required: ['channelId'],
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.channelId === 'string' && Object.keys(endpoint).length === 1,
  },
  [ENDPOINT_TYPES.SLACK_USER]: {
    description: 'Slack User Endpoint',
    properties: { userId: { type: 'string' as const } },
    required: ['userId'],
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.userId === 'string' && Object.keys(endpoint).length === 1,
  },
  [ENDPOINT_TYPES.WEBHOOK]: {
    description: 'Webhook Endpoint (with optional channel)',
    properties: { url: { type: 'string' as const }, channel: { type: 'string' as const } },
    required: ['url'],
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.url === 'string' &&
      Object.keys(endpoint).length >= 1 &&
      Object.keys(endpoint).length <= 2 &&
      (endpoint.channel === undefined || typeof endpoint.channel === 'string'),
  },
  [ENDPOINT_TYPES.PHONE]: {
    description: 'Phone Endpoint',
    properties: { phoneNumber: { type: 'string' as const } },
    required: ['phoneNumber'],
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.phoneNumber === 'string' && Object.keys(endpoint).length === 1,
  },
  [ENDPOINT_TYPES.MS_TEAMS_CHANNEL]: {
    description: 'MS Teams Channel Endpoint',
    properties: {
      teamId: { type: 'string' as const },
      channelId: { type: 'string' as const },
    },
    required: ['teamId', 'channelId'],
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.teamId === 'string' &&
      typeof endpoint.channelId === 'string' &&
      Object.keys(endpoint).length === 2,
  },
  [ENDPOINT_TYPES.MS_TEAMS_USER]: {
    description: 'MS Teams User Endpoint',
    properties: { userId: { type: 'string' as const }, tenantId: { type: 'string' as const } },
    required: ['userId'],
    // tenantId is optional (the user's Azure AD tenant); allow it as a second key for multi-tenant delivery.
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.userId === 'string' &&
      Object.keys(endpoint).length >= 1 &&
      Object.keys(endpoint).length <= 2 &&
      (endpoint.tenantId === undefined || typeof endpoint.tenantId === 'string'),
  },
  [ENDPOINT_TYPES.TELEGRAM_CHAT]: {
    description: 'Telegram Chat Endpoint',
    properties: { chatId: { type: 'string' as const } },
    required: ['chatId'],
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.chatId === 'string' && Object.keys(endpoint).length === 1,
  },
  [ENDPOINT_TYPES.WEBEX_ROOM]: {
    description: 'Webex Room Endpoint',
    properties: {
      roomId: { type: 'string' as const },
      parentId: { type: 'string' as const },
    },
    required: ['roomId'],
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.roomId === 'string' &&
      endpoint.roomId.length > 0 &&
      (endpoint.parentId === undefined || (typeof endpoint.parentId === 'string' && endpoint.parentId.length > 0)) &&
      Object.keys(endpoint).every((key) => ['roomId', 'parentId'].includes(key)),
  },
  [ENDPOINT_TYPES.WEBEX_PERSON]: {
    description: 'Webex Person Endpoint',
    properties: {
      personId: { type: 'string' as const },
      personEmail: { type: 'string' as const },
    },
    required: [],
    validate: (endpoint: Record<string, unknown>) => {
      const keys = Object.keys(endpoint);
      const hasPersonId = Object.prototype.hasOwnProperty.call(endpoint, 'personId');
      const hasPersonEmail = Object.prototype.hasOwnProperty.call(endpoint, 'personEmail');

      return (
        keys.every((key) => ['personId', 'personEmail'].includes(key)) &&
        hasPersonId !== hasPersonEmail &&
        (!hasPersonId || (typeof endpoint.personId === 'string' && endpoint.personId.length > 0)) &&
        (!hasPersonEmail || (typeof endpoint.personEmail === 'string' && endpoint.personEmail.length > 0))
      );
    },
  },
  [ENDPOINT_TYPES.LINE_USER]: {
    description: 'LINE User Endpoint',
    properties: { userId: { type: 'string' as const } },
    required: ['userId'],
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.userId === 'string' && Object.keys(endpoint).length === 1,
  },
  /*
   * PagerDuty wire shape: 32-character alphanumeric routing key + region.
   * Format-validated at write time so a truncated paste or whitespace-in-key
   * fails fast at the API boundary rather than at the first incident send.
   * The API layer persists the routingKey encrypted on the linked
   * `ChannelConnection.auth`; the stored endpoint document is empty.
   */
  [ENDPOINT_TYPES.PAGERDUTY_SERVICE]: {
    description: 'PagerDuty Service Endpoint',
    properties: {
      routingKey: { type: 'string' as const },
      region: { type: 'string' as const },
    },
    required: ['routingKey', 'region'],
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.routingKey === 'string' &&
      /^[a-zA-Z0-9]{32}$/.test(endpoint.routingKey) &&
      (endpoint.region === 'us' || endpoint.region === 'eu') &&
      Object.keys(endpoint).length === 2,
  },
  /*
   * Opsgenie wire shape: UUID-format API integration key (GenieKey) + region.
   * Format-validated at write time so a truncated paste or an account-level
   * API-management key of the wrong shape fails fast at the API boundary
   * rather than at the first alert send. The API layer persists the apiKey
   * encrypted on the linked `ChannelConnection.auth`; the stored endpoint
   * document is empty.
   */
  [ENDPOINT_TYPES.OPSGENIE_INTEGRATION]: {
    description: 'Opsgenie Integration Endpoint',
    properties: {
      apiKey: { type: 'string' as const },
      region: { type: 'string' as const },
    },
    required: ['apiKey', 'region'],
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.apiKey === 'string' &&
      isValidOpsgenieApiKey(endpoint.apiKey) &&
      (endpoint.region === 'us' || endpoint.region === 'eu') &&
      Object.keys(endpoint).length === 2,
  },
  /*
   * Tool-webhook wire shape: required URL + optional headers object + optional HTTP method.
   * Validated at write time so malformed URLs / unknown keys fail at the API boundary.
   * The API layer persists url/headers/method encrypted on the linked
   * `ChannelConnection.auth`; the stored endpoint document is empty.
   */
  [ENDPOINT_TYPES.TOOL_WEBHOOK]: {
    description: 'Tool Webhook Endpoint',
    properties: {
      url: { type: 'string' as const },
      headers: { type: 'object' as const },
      method: { type: 'string' as const },
    },
    required: ['url'],
    validate: (endpoint: Record<string, unknown>) => isValidToolWebhookEndpoint(endpoint),
  },
} as const;

const TOOL_WEBHOOK_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const TOOL_WEBHOOK_ALLOWED_KEYS = new Set(['url', 'headers', 'method']);

function isValidToolWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidToolWebhookHeaders(headers: unknown): boolean {
  if (headers === undefined) {
    return true;
  }

  if (typeof headers !== 'object' || headers === null || Array.isArray(headers)) {
    return false;
  }

  return Object.values(headers).every((value) => typeof value === 'string');
}

function isValidToolWebhookEndpoint(endpoint: Record<string, unknown>): boolean {
  const keys = Object.keys(endpoint);

  return (
    keys.every((key) => TOOL_WEBHOOK_ALLOWED_KEYS.has(key)) &&
    typeof endpoint.url === 'string' &&
    isValidToolWebhookUrl(endpoint.url) &&
    isValidToolWebhookHeaders(endpoint.headers) &&
    (endpoint.method === undefined ||
      (typeof endpoint.method === 'string' && TOOL_WEBHOOK_METHODS.has(endpoint.method)))
  );
}

// Generate API property examples automatically
export function getApiPropertyExamples() {
  return Object.entries(CHANNEL_ENDPOINT_SCHEMAS).map(([, schema]) => ({
    properties: schema.properties,
    description: schema.description,
  }));
}

// Generate validator function automatically
export function validateEndpointForTypeFromSchema(
  type: ChannelEndpointType,
  endpoint: Record<string, unknown>
): boolean {
  const schema = CHANNEL_ENDPOINT_SCHEMAS[type];
  return schema ? schema.validate(endpoint) : false;
}

// Convenience function that throws exception
export function validateEndpointForType(type: ChannelEndpointType, endpoint: Record<string, unknown>): void {
  if (!validateEndpointForTypeFromSchema(type, endpoint)) {
    throw new BadRequestException(`Endpoint must match the required format for type "${type}"`);
  }
}

// Compile-time exhaustiveness check: this will cause a TypeScript error if any ENDPOINT_TYPE is missing from schemas
function _assertExhaustiveSchemas(): void {
  const _check: Record<ChannelEndpointType, unknown> = CHANNEL_ENDPOINT_SCHEMAS;
  // If compilation fails here, you're missing a schema for an ENDPOINT_TYPE
}
