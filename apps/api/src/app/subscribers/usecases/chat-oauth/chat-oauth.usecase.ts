import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository, ICredentialsEntity, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';

import { ChatOauthCommand } from './chat-oauth.command';
import {
  createSubscriberChatOAuthState,
  validateSubscriberHmac,
} from './subscriber-chat-oauth-state.util';

@Injectable()
export class ChatOauth {
  readonly SLACK_OAUTH_URL = 'https://slack.com/oauth/v2/authorize?';

  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository
  ) {}
  async execute(command: ChatOauthCommand): Promise<string> {
    const { clientId } = await this.getCredentials(command);
    const apiKey = await this.getEnvironmentApiKey(command.environmentId);

    validateSubscriberHmac({
      apiKey,
      subscriberId: command.subscriberId,
      hmacHash: command.hmacHash,
    });

    const secureState = createSubscriberChatOAuthState(
      {
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        providerId: command.providerId,
        integrationIdentifier: command.integrationIdentifier,
      },
      apiKey
    );

    return this.getOAuthUrl(command, clientId!, secureState);
  }

  private getOAuthUrl(command: ChatOauthCommand, clientId: string, secureState: string): string {
    let redirectUri = `${
      process.env.API_ROOT_URL
    }/v1/subscribers/${command.subscriberId}/credentials/${command.providerId}/oauth/callback?environmentId=${command.environmentId}`;

    if (command.integrationIdentifier) {
      redirectUri = `${redirectUri}&integrationIdentifier=${command.integrationIdentifier}`;
    }

    const oauthParams = new URLSearchParams({
      client_id: clientId,
      scope: 'incoming-webhook',
      redirect_uri: redirectUri,
      state: secureState,
    });

    return `${this.SLACK_OAUTH_URL}${oauthParams.toString()}`;
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
