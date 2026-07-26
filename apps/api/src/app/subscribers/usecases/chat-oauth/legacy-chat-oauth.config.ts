import { NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { CommunityOrganizationRepository, EnvironmentRepository, OrganizationEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum, LegacySubscriberChatOauthMode } from '@novu/shared';

export const CHAT_INTEGRATION_NOT_FOUND_MESSAGE = 'Chat integration not found';

export const LEGACY_CHAT_OAUTH_MIGRATION_HINT =
  'The per-subscriber chat OAuth endpoints are deprecated. Use POST /v1/integrations/chat/oauth to mint an ' +
  'authenticated OAuth URL instead.';

const VALID_MODES = new Set<string>(Object.values(LegacySubscriberChatOauthMode));

type LegacyChatOauthOrganization = Pick<OrganizationEntity, '_id' | 'createdAt'>;

export async function getLegacyChatOauthMode(
  featureFlagsService: FeatureFlagsService,
  organization: LegacyChatOauthOrganization
): Promise<LegacySubscriberChatOauthMode> {
  const configured = await featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.LEGACY_SUBSCRIBER_CHAT_OAUTH_MODE,
    defaultValue: LegacySubscriberChatOauthMode.DISABLED,
    organization,
  });

  const normalized = typeof configured === 'string' ? configured.trim().toLowerCase() : '';

  if (!VALID_MODES.has(normalized)) {
    return LegacySubscriberChatOauthMode.DISABLED;
  }

  return normalized as LegacySubscriberChatOauthMode;
}

export async function resolveLegacyChatOauthOrganization(
  environmentRepository: EnvironmentRepository,
  organizationRepository: CommunityOrganizationRepository,
  environmentId: string
): Promise<LegacyChatOauthOrganization> {
  const environment = await environmentRepository.findOne({ _id: environmentId }, '_organizationId');

  if (!environment?._organizationId) {
    throw new NotFoundException(CHAT_INTEGRATION_NOT_FOUND_MESSAGE);
  }

  const organization = await organizationRepository.findOne({ _id: environment._organizationId }, '_id createdAt');

  if (!organization) {
    throw new NotFoundException(CHAT_INTEGRATION_NOT_FOUND_MESSAGE);
  }

  return organization;
}
