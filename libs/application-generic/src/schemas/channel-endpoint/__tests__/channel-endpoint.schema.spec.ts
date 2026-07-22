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
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.LINE_USER, { userId: 'U1234567890abcdef' })).toBe(true);

    // Invalid cases
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.SLACK_CHANNEL, { userId: 'U123' })).toBe(false);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.SLACK_USER, { channelId: 'C123' })).toBe(false);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBHOOK, { url: 'not-a-url' })).toBe(false);

    // Extra properties should fail
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.SLACK_CHANNEL, { channelId: 'C123', extra: 'prop' })).toBe(
      false
    );
  });

  it('should validate Webex endpoints correctly', () => {
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_ROOM, { roomId: 'room-id' })).toBe(true);
    expect(
      validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_ROOM, { roomId: 'room-id', parentId: 'parent-id' })
    ).toBe(true);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_PERSON, { personId: 'person-id' })).toBe(true);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_PERSON, { personEmail: 'user@example.com' })).toBe(
      true
    );

    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_ROOM, {})).toBe(false);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_ROOM, { roomId: '' })).toBe(false);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_ROOM, { roomId: 'room-id', parentId: '' })).toBe(
      false
    );
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_ROOM, { roomId: 'room-id', extra: 'value' })).toBe(
      false
    );
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_PERSON, {})).toBe(false);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_PERSON, { personId: '' })).toBe(false);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_PERSON, { personEmail: '' })).toBe(false);
    expect(
      validateEndpointForTypeFromSchema(ENDPOINT_TYPES.WEBEX_PERSON, {
        personId: 'person-id',
        personEmail: 'user@example.com',
      })
    ).toBe(false);
  });

  it('should validate Opsgenie endpoints with non-hex GenieKey segments', () => {
    expect(
      validateEndpointForTypeFromSchema(ENDPOINT_TYPES.OPSGENIE_INTEGRATION, {
        apiKey: 'abcdefg-a25a-4652-883c-73703b12345',
        region: 'us',
      })
    ).toBe(true);
    expect(
      validateEndpointForTypeFromSchema(ENDPOINT_TYPES.OPSGENIE_INTEGRATION, {
        apiKey: 'not-a-uuid',
        region: 'us',
      })
    ).toBe(false);
  });

  it('should validate tool_webhook endpoints', () => {
    expect(
      validateEndpointForTypeFromSchema(ENDPOINT_TYPES.TOOL_WEBHOOK, {
        url: 'https://hooks.example.com/inbound',
      })
    ).toBe(true);
    expect(
      validateEndpointForTypeFromSchema(ENDPOINT_TYPES.TOOL_WEBHOOK, {
        url: 'https://hooks.example.com/inbound',
        headers: { Authorization: 'Bearer token' },
        method: 'PUT',
      })
    ).toBe(true);
    expect(
      validateEndpointForTypeFromSchema(ENDPOINT_TYPES.TOOL_WEBHOOK, {
        url: 'http://localhost:3000/hook',
        method: 'PATCH',
      })
    ).toBe(true);

    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.TOOL_WEBHOOK, {})).toBe(false);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.TOOL_WEBHOOK, { url: 'not-a-url' })).toBe(false);
    expect(validateEndpointForTypeFromSchema(ENDPOINT_TYPES.TOOL_WEBHOOK, { url: 'ftp://example.com' })).toBe(false);
    expect(
      validateEndpointForTypeFromSchema(ENDPOINT_TYPES.TOOL_WEBHOOK, {
        url: 'https://hooks.example.com/inbound',
        method: 'DELETE',
      })
    ).toBe(false);
    expect(
      validateEndpointForTypeFromSchema(ENDPOINT_TYPES.TOOL_WEBHOOK, {
        url: 'https://hooks.example.com/inbound',
        headers: 'Authorization: Bearer token',
      })
    ).toBe(false);
    expect(
      validateEndpointForTypeFromSchema(ENDPOINT_TYPES.TOOL_WEBHOOK, {
        url: 'https://hooks.example.com/inbound',
        headers: { Authorization: 123 },
      })
    ).toBe(false);
    expect(
      validateEndpointForTypeFromSchema(ENDPOINT_TYPES.TOOL_WEBHOOK, {
        url: 'https://hooks.example.com/inbound',
        extra: 'prop',
      })
    ).toBe(false);
  });
});
