import { BadRequestException } from '@nestjs/common';
import { ADDRESS_TYPES, ChannelAddressType } from '@novu/shared';

// Centralized schema definition
export const CHANNEL_ADDRESS_SCHEMAS = {
  [ADDRESS_TYPES.SLACK_CHANNEL]: {
    description: 'Slack Channel Address',
    properties: { channelId: { type: 'string' as const } },
    required: ['channelId'],
    validate: (addr: Record<string, unknown>) => typeof addr.channelId === 'string' && Object.keys(addr).length === 1,
  },
  [ADDRESS_TYPES.SLACK_USER]: {
    description: 'Slack User Address',
    properties: { userId: { type: 'string' as const } },
    required: ['userId'],
    validate: (addr: Record<string, unknown>) => typeof addr.userId === 'string' && Object.keys(addr).length === 1,
  },
  [ADDRESS_TYPES.WEBHOOK]: {
    description: 'Webhook Address (with optional channel)',
    properties: { url: { type: 'string' as const }, channel: { type: 'string' as const } },
    required: ['url'],
    validate: (addr: Record<string, unknown>) => typeof addr.url === 'string' && Object.keys(addr).length === 1,
  },
  [ADDRESS_TYPES.PHONE]: {
    description: 'Phone Address',
    properties: { phoneNumber: { type: 'string' as const } },
    required: ['phoneNumber'],
    validate: (addr: Record<string, unknown>) => typeof addr.phoneNumber === 'string' && Object.keys(addr).length === 1,
  },
} as const;

// Generate API property examples automatically
export function getApiPropertyExamples() {
  return Object.entries(CHANNEL_ADDRESS_SCHEMAS).map(([, schema]) => ({
    properties: schema.properties,
    description: schema.description,
  }));
}

// Generate validator function automatically
export function validateAddressForTypeFromSchema(type: ChannelAddressType, address: Record<string, unknown>): boolean {
  const schema = CHANNEL_ADDRESS_SCHEMAS[type];
  return schema ? schema.validate(address) : false;
}

// Convenience function that throws exception
export function validateAddressForType(type: ChannelAddressType, address: Record<string, unknown>): void {
  if (!validateAddressForTypeFromSchema(type, address)) {
    throw new BadRequestException(`Address must match the required format for type "${type}"`);
  }
}

// Compile-time exhaustiveness check: this will cause a TypeScript error if any ADDRESS_TYPE is missing from schemas
function _assertExhaustiveSchemas(): void {
  const _check: Record<ChannelAddressType, unknown> = CHANNEL_ADDRESS_SCHEMAS;
  // If compilation fails here, you're missing a schema for an ADDRESS_TYPE
}
