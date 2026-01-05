import { BadRequestException } from '@nestjs/common';
import { ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';

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
    properties: { userId: { type: 'string' as const } },
    required: ['userId'],
    validate: (endpoint: Record<string, unknown>) =>
      typeof endpoint.userId === 'string' && Object.keys(endpoint).length === 1,
  },
} as const;

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
