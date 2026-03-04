import { expect } from 'chai';
import { isSubscriberError, SUBSCRIBER_ERROR_PATTERNS } from './send-message-push.usecase';

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
