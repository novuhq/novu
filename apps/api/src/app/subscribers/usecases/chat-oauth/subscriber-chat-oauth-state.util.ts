import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  assertOAuthStateFieldsMatch,
  createHash,
  createSignedOAuthState,
  FeatureFlagsService,
  peekOAuthStatePayload,
  validateSignedOAuthState,
} from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { ChatProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { areHexDigestsEqual } from '../../../shared/helpers/timing-safe-equal';

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
  return createSignedOAuthState<SubscriberChatOAuthState>(stateData, environmentApiKey);
}

export async function decodeSubscriberChatOAuthState(
  state: string,
  environmentRepository: EnvironmentRepository
): Promise<SubscriberChatOAuthState> {
  const preliminaryData = peekOAuthStatePayload<Partial<SubscriberChatOAuthState>>(state);

  if (!preliminaryData.environmentId) {
    throw new BadRequestException('Invalid or expired OAuth state parameter');
  }

  const environmentApiKey = await getEnvironmentApiKey(environmentRepository, preliminaryData.environmentId);

  return validateSignedOAuthState<SubscriberChatOAuthState>(
    state,
    environmentApiKey,
    undefined,
    'Invalid or expired OAuth state parameter'
  );
}

export function assertSubscriberChatOAuthStateMatchesRoute(
  decoded: SubscriberChatOAuthState,
  routeParams: Omit<SubscriberChatOAuthState, 'timestamp'>
): void {
  assertOAuthStateFieldsMatch(decoded, routeParams, 'Invalid or expired OAuth state parameter');
}

export function validateSubscriberHmac({
  apiKey,
  subscriberId,
  hmacHash,
}: {
  apiKey: string;
  subscriberId: string;
  hmacHash: string;
}) {
  const expectedHmacHash = createHash(apiKey, subscriberId);

  if (!expectedHmacHash || !areHexDigestsEqual(expectedHmacHash, hmacHash)) {
    throw new BadRequestException('Invalid HMAC hash for subscriber chat OAuth');
  }
}

export async function isSubscriberChatOAuthHmacRequired(
  featureFlagsService: FeatureFlagsService,
  environmentId: string
): Promise<boolean> {
  return featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_SUBSCRIBER_CHAT_OAUTH_HMAC_REQUIRED_ENABLED,
    defaultValue: true,
    environment: { _id: environmentId },
  });
}

export async function assertSubscriberChatOAuthHmacWhenRequired({
  featureFlagsService,
  environmentId,
  apiKey,
  subscriberId,
  hmacHash,
}: {
  featureFlagsService: FeatureFlagsService;
  environmentId: string;
  apiKey: string;
  subscriberId: string;
  hmacHash?: string;
}): Promise<void> {
  const isHmacRequired = await isSubscriberChatOAuthHmacRequired(featureFlagsService, environmentId);

  if (!isHmacRequired) {
    return;
  }

  if (!hmacHash) {
    throw new BadRequestException('HMAC hash is required to initiate subscriber chat OAuth');
  }

  validateSubscriberHmac({
    apiKey,
    subscriberId,
    hmacHash,
  });
}

async function getEnvironmentApiKey(
  environmentRepository: EnvironmentRepository,
  environmentId: string
): Promise<string> {
  const apiKeys = await environmentRepository.getApiKeys(environmentId);

  if (!apiKeys.length) {
    throw new NotFoundException(`Environment ID: ${environmentId} not found`);
  }

  return apiKeys[0].key;
}
