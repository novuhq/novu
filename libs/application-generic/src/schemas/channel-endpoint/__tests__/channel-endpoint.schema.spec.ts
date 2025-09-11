import { ENDPOINT_TYPES } from '@novu/shared';
import {
  CHANNEL_ENDPOINT_SCHEMAS,
  getApiPropertyExamples,
  validateEndpointForTypeFromSchema,
} from '../channel-endpoint.schema';

describe('ChannelEndpointSchema', () => {
  // This test will FAIL if you add a new ENDPOINT_TYPE but forget to add it to CHANNEL_ENDPOINT_SCHEMAS
  it('should have schema definitions for all ENDPOINT_TYPES', () => {
    const endpointTypes = Object.values(ENDPOINT_TYPES);
    const schemaKeys = Object.keys(CHANNEL_ENDPOINT_SCHEMAS);

    expect(schemaKeys.sort()).toEqual(endpointTypes.sort());
  });

  it('should generate API property examples for all types', () => {
    const examples = getApiPropertyExamples();
    const endpointTypesCount = Object.keys(ENDPOINT_TYPES).length;

    expect(examples).toHaveLength(endpointTypesCount);
    expect(examples.every((ex) => ex.properties && ex.description)).toBe(true);
  });

  it('should validate endpoints correctly', () => {
    // Valid cases
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.SLACK_CHANNEL, { channelId: 'C123' })).toBe(true);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.SLACK_USER, { userId: 'U123' })).toBe(true);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBHOOK, { url: 'https://example.com' })).toBe(true);

    // Invalid cases
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.SLACK_CHANNEL, { userId: 'U123' })).toBe(false);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.SLACK_USER, { channelId: 'C123' })).toBe(false);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBHOOK, { url: 'not-a-url' })).toBe(false);

    // Extra properties should fail
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.SLACK_CHANNEL, { channelId: 'C123', extra: 'prop' })).toBe(
      false
    );
  });
});
