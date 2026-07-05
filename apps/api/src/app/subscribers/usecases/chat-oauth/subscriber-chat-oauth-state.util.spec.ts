import { BadRequestException } from '@nestjs/common';
import { createHash, encodeOAuthState } from '@novu/application-generic';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import {
  createSubscriberChatOAuthState,
  SUBSCRIBER_CHAT_OAUTH_STATE_TTL_MS,
  validateSubscriberChatOAuthState,
} from './subscriber-chat-oauth-state.util';

const MOCK_API_KEY = 'test-api-key';
const MOCK_ENVIRONMENT_ID = '507f1f77bcf86cd799439011';
const MOCK_SUBSCRIBER_ID = 'subscriber-abc';
const MOCK_PROVIDER_ID = ChatProviderIdEnum.Slack;

describe('subscriber-chat-oauth-state.util', () => {
  const baseState = {
    environmentId: MOCK_ENVIRONMENT_ID,
    subscriberId: MOCK_SUBSCRIBER_ID,
    providerId: MOCK_PROVIDER_ID,
  };

  it('should create and validate a signed OAuth state', () => {
    const state = createSubscriberChatOAuthState(baseState, MOCK_API_KEY);

    const decoded = validateSubscriberChatOAuthState(state, MOCK_API_KEY, baseState);

    expect(decoded.environmentId).to.equal(MOCK_ENVIRONMENT_ID);
    expect(decoded.subscriberId).to.equal(MOCK_SUBSCRIBER_ID);
    expect(decoded.providerId).to.equal(MOCK_PROVIDER_ID);
  });

  it('should reject tampered subscriber binding', () => {
    const state = createSubscriberChatOAuthState(baseState, MOCK_API_KEY);

    expect(() =>
      validateSubscriberChatOAuthState(state, MOCK_API_KEY, {
        ...baseState,
        subscriberId: 'victim-subscriber',
      })
    ).to.throw(BadRequestException, 'Invalid or expired OAuth state parameter');
  });

  it('should reject expired OAuth state', () => {
    const payload = JSON.stringify({
      ...baseState,
      timestamp: Date.now() - SUBSCRIBER_CHAT_OAUTH_STATE_TTL_MS - 1,
    });
    const signature = createHash(MOCK_API_KEY, payload)!;
    const state = encodeOAuthState(payload, signature);

    expect(() => validateSubscriberChatOAuthState(state, MOCK_API_KEY, baseState)).to.throw(
      BadRequestException,
      'Invalid or expired OAuth state parameter'
    );
  });

  it('should reject invalid signature', () => {
    const state = createSubscriberChatOAuthState(baseState, MOCK_API_KEY);

    expect(() => validateSubscriberChatOAuthState(state, 'wrong-api-key', baseState)).to.throw(
      BadRequestException,
      'Invalid or expired OAuth state parameter'
    );
  });
});
