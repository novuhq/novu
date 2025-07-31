import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from '@novu/application-generic';
import { EnvironmentRepository, ICredentialsEntity, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';

import { ChatOauthCommand } from './chat-oauth.command';

@Injectable()
export class ChatOauth {
  readonly SLACK_OAUTH_URL = 'https://slack.com/oauth/v2/authorize?';

  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository
  ) {}
  async execute(command: ChatOauthCommand): Promise<string> {
    const { clientId, hmac } = await this.getCredentials(command);

    await this.hmacValidation({
      credentialHmac: hmac,
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
      externalHmacHash: command.hmacHash,
    });

    return this.getOAuthUrl(command.subscriberId, command.environmentId, clientId!, command.integrationIdentifier);
  }

  private async hmacValidation({
    credentialHmac,
    environmentId,
    subscriberId,
    externalHmacHash,
  }: {
    credentialHmac: boolean | undefined;
    environmentId: string;
    subscriberId: string;
    externalHmacHash: string | undefined;
  }) {
    if (credentialHmac) {
      if (!externalHmacHash) {
        throw new BadRequestException(
          'Hmac is enabled on the integration, please provide a HMAC hash on the request params'
        );
      }

      const apiKey = await this.getEnvironmentApiKey(environmentId);

      validateEncryption({
        apiKey,
        subscriberId,
        externalHmacHash,
      });
    }
  }

  private getOAuthUrl(
    subscriberId: string,
    environmentId: string,
    clientId: string,
    integrationIdentifier?: string
  ): string {
    let redirectUri = `${
      process.env.API_ROOT_URL
    }/v1/subscribers/${subscriberId}/credentials/slack/oauth/callback?environmentId=${environmentId}`;

    if (integrationIdentifier) {
      redirectUri = `${redirectUri}&integrationIdentifier=${integrationIdentifier}`;
    }

    return `${
      this.SLACK_OAUTH_URL
    }client_id=${clientId}&scope=incoming-webhook&user_scope=&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  private async getCredentials(command: ChatOauthCommand): Promise<ICredentialsEntity> {
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

    if (!integration) {
      throw new NotFoundException(
        `Integration in environment ${command.environmentId} was not found, channel: ${ChannelTypeEnum.CHAT}, ` +
          `providerId: ${command.providerId}`
      );
    }

    if (!integration.credentials) {
      throw new NotFoundException(
        `Integration in environment ${command.environmentId} missing credentials, channel: ${ChannelTypeEnum.CHAT}, ` +
          `providerId: ${command.providerId}`
      );
    }

    if (!integration.credentials.clientId) {
      throw new NotFoundException(
        `Integration in environment ${command.environmentId} missing clientId, channel: ${ChannelTypeEnum.CHAT}, ` +
          `providerId: ${command.providerId}`
      );
    }

    return integration.credentials;
  }

  private async getEnvironmentApiKey(environmentId: string): Promise<string> {
    const apiKeys = await this.environmentRepository.getApiKeys(environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(`Environment ID: ${environmentId} not found`);
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
  if (hmacHash !== externalHmacHash) {
    throw new BadRequestException('Hmac is enabled on the integration, please provide a valid HMAC hash');
  }
}
