import { BadRequestException } from '@nestjs/common';
import { createHash, encodeOAuthState, splitOAuthState } from '@novu/application-generic';
import { ChatProviderIdEnum } from '@novu/shared';
import { areHexDigestsEqual } from '../../../shared/helpers/timing-safe-equal';

export const SUBSCRIBER_CHAT_OAUTH_STATE_TTL_MS = 5 * 60 * 1000;

export type SubscriberChatOAuthState = {
  environmentId: string;
  subscriberId: string;
  providerId: ChatProviderIdEnum;
  integrationIdentifier?: string;
  timestamp: number;
};

export function createSubscriberChatOAuthState(
  stateData: Omit<SubscriberChatOAuthState, 'timestamp'>,
  environmentApiKey: string
): string {
  const payload = JSON.stringify({
    ...stateData,
    timestamp: Date.now(),
  } satisfies SubscriberChatOAuthState);

  const signature = createHash(environmentApiKey, payload);

  if (!signature) {
    throw new BadRequestException('Failed to create OAuth state signature');
  }

  return encodeOAuthState(payload, signature);
}

export function validateSubscriberChatOAuthState(
  state: string,
  environmentApiKey: string,
  expected: Omit<SubscriberChatOAuthState, 'timestamp'>
): SubscriberChatOAuthState {
  try {
    const { payload, signature } = splitOAuthState(state);
    const expectedSignature = createHash(environmentApiKey, payload);

    if (!expectedSignature || !areHexDigestsEqual(expectedSignature, signature)) {
      throw new Error('Invalid state signature');
    }

    const data = JSON.parse(payload) as SubscriberChatOAuthState;

    if (Date.now() - data.timestamp > SUBSCRIBER_CHAT_OAUTH_STATE_TTL_MS) {
      throw new Error('OAuth state expired');
    }

    if (data.environmentId !== expected.environmentId) {
      throw new Error('OAuth state environment mismatch');
    }

    if (data.subscriberId !== expected.subscriberId) {
      throw new Error('OAuth state subscriber mismatch');
    }

    if (data.providerId !== expected.providerId) {
      throw new Error('OAuth state provider mismatch');
    }

    if (expected.integrationIdentifier !== data.integrationIdentifier) {
      throw new Error('OAuth state integration mismatch');
    }

    return data;
  } catch {
    throw new BadRequestException('Invalid or expired OAuth state parameter');
  }
}
