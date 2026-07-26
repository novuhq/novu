import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  EnvironmentRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { LegacySubscriberChatOauthMode } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';

import { isHmacValidForAnyKey } from '../../../shared/helpers/is-valid-hmac';
import { ChatOauthCommand } from './chat-oauth.command';
import {
  CHAT_INTEGRATION_NOT_FOUND_MESSAGE,
  getLegacyChatOauthMode,
  LEGACY_CHAT_OAUTH_MIGRATION_HINT,
  resolveLegacyChatOauthOrganization,
} from './legacy-chat-oauth.config';
import { encodeLegacyChatOauthState } from './legacy-chat-oauth-state';

/**
 * @deprecated Use `POST /v1/integrations/chat/oauth`.
 * @see apps/api/src/app/integrations/usecases/generate-chat-oath-url
 */
@Injectable()
export class ChatOauth {
  readonly SLACK_OAUTH_URL = 'https://slack.com/oauth/v2/authorize?';

  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private organizationRepository: CommunityOrganizationRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(ChatOauth.name);
  }

  async execute(command: ChatOauthCommand): Promise<string> {
    const organization = await resolveLegacyChatOauthOrganization(
      this.environmentRepository,
      this.organizationRepository,
      command.environmentId
    );
    const mode = await getLegacyChatOauthMode(this.featureFlagsService, organization);

    if (mode === LegacySubscriberChatOauthMode.DISABLED) {
      throw new ForbiddenException(LEGACY_CHAT_OAUTH_MIGRATION_HINT);
    }

    const integration = await this.getIntegration(command);
    const { clientId, hmac } = integration.credentials;

    if (!clientId) {
      throw new NotFoundException(CHAT_INTEGRATION_NOT_FOUND_MESSAGE);
    }

    const apiKeys = await this.getEnvironmentApiKeys(command.environmentId);

    assertLegacyChatOauthHmac({
      isHmacRequired: hmac === true || mode === LegacySubscriberChatOauthMode.HMAC_REQUIRED,
      apiKeys,
      subscriberId: command.subscriberId,
      externalHmacHash: command.hmacHash,
    });

    this.logger.warn(
      {
        environmentId: command.environmentId,
        organizationId: integration._organizationId,
        providerId: command.providerId,
        integrationIdentifier: integration.identifier,
        mode,
        hmacEnabled: hmac === true,
      },
      `Deprecated per-subscriber chat OAuth URL requested. ${LEGACY_CHAT_OAUTH_MIGRATION_HINT}`
    );

    const state = encodeLegacyChatOauthState(
      {
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        providerId: command.providerId,
        integrationIdentifier: command.integrationIdentifier,
        hmacHash: command.hmacHash,
        timestamp: Date.now(),
      },
      apiKeys[0]
    );

    return this.getOAuthUrl(
      command.subscriberId,
      command.environmentId,
      clientId,
      state,
      command.integrationIdentifier
    );
  }

  private getOAuthUrl(
    subscriberId: string,
    environmentId: string,
    clientId: string,
    state: string,
    integrationIdentifier?: string
  ): string {
    // The redirect URI is registered with the provider and rebuilt verbatim by
    // the callback for the token exchange — it must stay byte-identical.
    let redirectUri = `${
      process.env.API_ROOT_URL
    }/v1/subscribers/${subscriberId}/credentials/slack/oauth/callback?environmentId=${environmentId}`;

    if (integrationIdentifier) {
      redirectUri = `${redirectUri}&integrationIdentifier=${integrationIdentifier}`;
    }

    return (
      `${this.SLACK_OAUTH_URL}client_id=${clientId}&scope=incoming-webhook&user_scope=` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
    );
  }

  private async getIntegration(command: ChatOauthCommand): Promise<IntegrationEntity> {
    const query: Partial<IntegrationEntity> & { _environmentId: string } = {
      _environmentId: command.environmentId,
      channel: ChannelTypeEnum.CHAT,
      providerId: command.providerId,
    };

    if (command.integrationIdentifier) {
      query.identifier = command.integrationIdentifier;
    }

    const integration = await this.integrationRepository.findOne(query, undefined, {
      query: { sort: { createdAt: -1 } },
    });

    if (!integration?.credentials) {
      this.logger.warn(
        {
          environmentId: command.environmentId,
          providerId: command.providerId,
          integrationIdentifier: command.integrationIdentifier,
          reason: integration ? 'missing credentials' : 'no matching integration',
        },
        'Legacy chat OAuth URL request could not be resolved to an integration'
      );

      throw new NotFoundException(CHAT_INTEGRATION_NOT_FOUND_MESSAGE);
    }

    return integration;
  }

  private async getEnvironmentApiKeys(environmentId: string): Promise<string[]> {
    const apiKeys = await this.environmentRepository.getApiKeys(environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(CHAT_INTEGRATION_NOT_FOUND_MESSAGE);
    }

    return apiKeys.map(({ key }) => key);
  }
}

/**
 * Validates the subscriber HMAC the way every other subscriber-facing surface
 * does: against the decrypted secret key the customer holds, and against every
 * active key so a rolling rotation does not break in-flight authorizations.
 * This flow used to hash the at-rest ciphertext instead, which no client could
 * reproduce — enabling `hmac` on an integration made the flow unusable rather
 * than protected.
 */
export function assertLegacyChatOauthHmac({
  isHmacRequired,
  apiKeys,
  subscriberId,
  externalHmacHash,
}: {
  isHmacRequired: boolean;
  apiKeys: string[];
  subscriberId: string;
  externalHmacHash: string | undefined;
}) {
  if (!isHmacRequired) {
    return;
  }

  if (!externalHmacHash) {
    throw new BadRequestException(
      'Hmac is enabled on the integration, please provide a HMAC hash on the request params'
    );
  }

  if (!isHmacValidForAnyKey(apiKeys, subscriberId, externalHmacHash)) {
    throw new BadRequestException('Hmac is enabled on the integration, please provide a valid HMAC hash');
  }
}
