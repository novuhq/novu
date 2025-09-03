import { ADDRESS_TYPES } from '@novu/shared';
import {
  CHANNEL_ADDRESS_SCHEMAS,
  getApiPropertyExamples,
  validateAddressForTypeFromSchema,
} from '../channel-address.schema';

describe('ChannelAddressSchema', () => {
  // This test will FAIL if you add a new ADDRESS_TYPE but forget to add it to CHANNEL_ADDRESS_SCHEMAS
  it('should have schema definitions for all ADDRESS_TYPES', () => {
    const addressTypes = Object.values(ADDRESS_TYPES);
    const schemaKeys = Object.keys(CHANNEL_ADDRESS_SCHEMAS);

    expect(schemaKeys.sort()).toEqual(addressTypes.sort());
  });

  it('should generate API property examples for all types', () => {
    const examples = getApiPropertyExamples();
    const addressTypesCount = Object.keys(ADDRESS_TYPES).length;

    expect(examples).toHaveLength(addressTypesCount);
    expect(examples.every((ex) => ex.properties && ex.description)).toBe(true);
  });

  it('should validate addresses correctly', () => {
    // Valid cases
    expect(validateAddressForTypeFromSchema(ADDRESS_TYPES.SLACK_CHANNEL, { channelId: 'C123' })).toBe(true);
    expect(validateAddressForTypeFromSchema(ADDRESS_TYPES.SLACK_USER, { userId: 'U123' })).toBe(true);
    expect(validateAddressForTypeFromSchema(ADDRESS_TYPES.WEBHOOK, { url: 'https://example.com' })).toBe(true);

    // Invalid cases
    expect(validateAddressForTypeFromSchema(ADDRESS_TYPES.SLACK_CHANNEL, { userId: 'U123' })).toBe(false);
    expect(validateAddressForTypeFromSchema(ADDRESS_TYPES.SLACK_USER, { channelId: 'C123' })).toBe(false);
    expect(validateAddressForTypeFromSchema(ADDRESS_TYPES.WEBHOOK, { url: 'not-a-url' })).toBe(false);

    // Extra properties should fail
    expect(validateAddressForTypeFromSchema(ADDRESS_TYPES.SLACK_CHANNEL, { channelId: 'C123', extra: 'prop' })).toBe(
      false
    );
  });
});
