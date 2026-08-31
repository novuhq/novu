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
