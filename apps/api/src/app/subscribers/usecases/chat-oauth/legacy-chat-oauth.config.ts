import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { CommunityOrganizationRepository, EnvironmentRepository, OrganizationEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';

export const CHAT_INTEGRATION_NOT_FOUND_MESSAGE = 'Chat integration not found';

export const LEGACY_CHAT_OAUTH_MIGRATION_HINT =
  'The per-subscriber chat OAuth endpoints are deprecated. From the browser, use the Novu connect components ' +
  '(POST /v1/inbox/channel-connections/oauth) with a subscriber token session; from a backend, use ' +
  'POST /v1/integrations/channel-connections/oauth.';

export const LEGACY_CHAT_OAUTH_NO_SIGNING_KEY_MESSAGE =
  'The API key revocation policy leaves no key to sign this chat OAuth request. Rotate the API key, then try again.';

export const LEGACY_CHAT_OAUTH_HMAC_REQUIRED_MESSAGE =
  'HMAC must be enabled on the Slack integration to use the per-subscriber chat OAuth endpoints. ' +
  LEGACY_CHAT_OAUTH_MIGRATION_HINT;

type LegacyChatOauthOrganization = Pick<OrganizationEntity, '_id' | 'createdAt'>;

export async function isLegacySubscriberChatOauthHmacRequired(
  featureFlagsService: FeatureFlagsService,
  organization: LegacyChatOauthOrganization
): Promise<boolean> {
  return featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_SUBSCRIBER_CHAT_OAUTH_HMAC_REQUIRED_ENABLED,
    defaultValue: true,
    organization,
  });
}

export function resolveLegacyChatOauthHmacRequired(
  hmacRequiredEnabled: boolean,
  integrationHmacEnabled: boolean
): boolean {
  if (hmacRequiredEnabled) {
    return true;
  }

  return integrationHmacEnabled;
}

export function assertLegacyChatOauthIntegrationHmacEnabled(
  hmacRequiredEnabled: boolean,
  integrationHmacEnabled: boolean
): void {
  if (hmacRequiredEnabled && !integrationHmacEnabled) {
    throw new ForbiddenException(LEGACY_CHAT_OAUTH_HMAC_REQUIRED_MESSAGE);
  }
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
