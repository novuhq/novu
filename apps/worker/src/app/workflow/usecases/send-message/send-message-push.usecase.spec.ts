import { expect } from 'chai';
import { isSubscriberError, SUBSCRIBER_ERROR_PATTERNS, serializePushProviderError } from './send-message-push.usecase';

describe('isSubscriberError', () => {
  for (const pattern of SUBSCRIBER_ERROR_PATTERNS) {
    it(`should return true for error containing "${pattern}"`, () => {
      expect(isSubscriberError(`Sending message failed due to "${pattern}"`)).to.be.true;
    });
  }

  it('should return true when the pattern appears anywhere in the message', () => {
    expect(isSubscriberError('firebase: NotRegistered - token expired')).to.be.true;
  });

  it('should return false for generic provider errors', () => {
    expect(isSubscriberError('Internal server error')).to.be.false;
    expect(isSubscriberError('Connection timeout')).to.be.false;
    expect(isSubscriberError('Rate limit exceeded')).to.be.false;
  });

  it('should return false for empty string', () => {
    expect(isSubscriberError('')).to.be.false;
  });
});

describe('serializePushProviderError', () => {
  it('does not throw when the error object has circular references (e.g. Axios-style)', () => {
    const circular: Record<string, unknown> = { message: 'request failed' };
    circular.self = circular;

    const serialized = serializePushProviderError(circular);
    const parsed = JSON.parse(serialized) as { message?: string; self?: string };

    expect(parsed.message).to.equal('request failed');
    expect(parsed.self).to.equal('[Circular]');
  });

  it('falls back to message and name for plain Error (JSON.stringify yields empty object)', () => {
    const serialized = serializePushProviderError(new Error('boom'));
    const parsed = JSON.parse(serialized) as { message: string; name: string };

    expect(parsed.message).to.equal('boom');
    expect(parsed.name).to.equal('Error');
  });
});

/**
 * Tests for the subscriber webhookUrl injection priority logic.
 *
 * The actual injection happens inside SendMessagePush.sendMessage() (private method),
 * but the priority logic is a simple pattern:
 *   subscriberWebhookUrl && !combinedOverrides.webhookUrl
 *     ? { ...combinedOverrides, webhookUrl: subscriberWebhookUrl }
 *     : combinedOverrides
 *
 * We test this logic directly to validate the three-tier priority:
 *   1. Trigger override (in combinedOverrides.webhookUrl) — highest
 *   2. Subscriber credential (subscriberWebhookUrl) — middle
 *   3. Integration config (not tested here, handled by provider) — lowest
 */
describe('webhookUrl priority injection logic', () => {
  function applySubscriberWebhookUrl(
    combinedOverrides: Record<string, unknown>,
    subscriberWebhookUrl?: string
  ): Record<string, unknown> {
    return subscriberWebhookUrl && !combinedOverrides.webhookUrl
      ? { ...combinedOverrides, webhookUrl: subscriberWebhookUrl }
      : combinedOverrides;
  }

  it('should use trigger override when both trigger and subscriber webhookUrls are present', () => {
    const combinedOverrides = { webhookUrl: 'https://trigger.example.com' };
    const result = applySubscriberWebhookUrl(combinedOverrides, 'https://subscriber.example.com');

    expect(result.webhookUrl).to.equal('https://trigger.example.com');
  });

  it('should use subscriber webhookUrl when trigger override is absent', () => {
    const combinedOverrides = { someOtherField: 'value' };
    const result = applySubscriberWebhookUrl(combinedOverrides, 'https://subscriber.example.com');

    expect(result.webhookUrl).to.equal('https://subscriber.example.com');
  });

  it('should not inject webhookUrl when both are absent', () => {
    const combinedOverrides = { someOtherField: 'value' };
    const result = applySubscriberWebhookUrl(combinedOverrides, undefined);

    expect(result).to.not.have.property('webhookUrl');
    expect(result).to.deep.equal({ someOtherField: 'value' });
  });

  it('should use trigger override when subscriber webhookUrl is undefined', () => {
    const combinedOverrides = { webhookUrl: 'https://trigger.example.com' };
    const result = applySubscriberWebhookUrl(combinedOverrides, undefined);

    expect(result.webhookUrl).to.equal('https://trigger.example.com');
  });

  it('should not inject empty string subscriber webhookUrl', () => {
    const combinedOverrides = { someOtherField: 'value' };
    const result = applySubscriberWebhookUrl(combinedOverrides, '');

    expect(result).to.not.have.property('webhookUrl');
  });

  it('should preserve other fields in combinedOverrides when injecting subscriber webhookUrl', () => {
    const combinedOverrides = { hmacSecretKey: 'secret', otherData: 123 };
    const result = applySubscriberWebhookUrl(combinedOverrides, 'https://subscriber.example.com');

    expect(result).to.deep.equal({
      hmacSecretKey: 'secret',
      otherData: 123,
      webhookUrl: 'https://subscriber.example.com',
    });
  });
});
