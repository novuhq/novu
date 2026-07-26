import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';

import { areHexDigestsEqual } from '../../../shared/helpers/timing-safe-equal';
import { ChatOauthCommand } from './chat-oauth.command';
import {
  getLegacyChatOauthMode,
  LEGACY_CHAT_OAUTH_MIGRATION_HINT,
  LegacyChatOauthMode,
} from './legacy-chat-oauth.config';
import { encodeLegacyChatOauthState } from './legacy-chat-oauth-state';

/**
 * Both the environment and the integration are reported the same way so an
 * unauthenticated caller cannot use the error to tell an environment that has
 * no chat integration from one that does not exist at all.
 */
export const CHAT_INTEGRATION_NOT_FOUND_MESSAGE = 'Chat integration not found';

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
    private logger: PinoLogger
  ) {
    this.logger.setContext(ChatOauth.name);
  }

  async execute(command: ChatOauthCommand): Promise<string> {
    const mode = getLegacyChatOauthMode();

    if (mode === LegacyChatOauthMode.DISABLED) {
      throw new ForbiddenException(LEGACY_CHAT_OAUTH_MIGRATION_HINT);
    }

    const integration = await this.getIntegration(command);
    const { clientId, hmac } = integration.credentials;

    if (!clientId) {
      throw new NotFoundException(CHAT_INTEGRATION_NOT_FOUND_MESSAGE);
    }

    const apiKey = await this.getEnvironmentApiKey(command.environmentId);

    this.hmacValidation({
      isHmacRequired: hmac === true || mode === LegacyChatOauthMode.HMAC_REQUIRED,
      apiKey,
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
      apiKey
    );

    return this.getOAuthUrl(
      command.subscriberId,
      command.environmentId,
      clientId,
      state,
      command.integrationIdentifier
    );
  }

  private hmacValidation({
    isHmacRequired,
    apiKey,
    subscriberId,
    externalHmacHash,
  }: {
    isHmacRequired: boolean;
    apiKey: string;
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

    validateEncryption({
      apiKey,
      subscriberId,
      externalHmacHash,
    });
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

  private async getEnvironmentApiKey(environmentId: string): Promise<string> {
    const apiKeys = await this.environmentRepository.getApiKeys(environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(CHAT_INTEGRATION_NOT_FOUND_MESSAGE);
    }

    return apiKeys[0].key;
  }
}

export function validateEncryption({
  apiKey,
  subscriberId,
  externalHmacHash,
}: {
  apiKey: string;
  subscriberId: string;
  externalHmacHash: string;
}) {
  const hmacHash = createHash(apiKey, subscriberId);

  if (!areHexDigestsEqual(hmacHash, externalHmacHash)) {
    throw new BadRequestException('Hmac is enabled on the integration, please provide a valid HMAC hash');
  }
}
