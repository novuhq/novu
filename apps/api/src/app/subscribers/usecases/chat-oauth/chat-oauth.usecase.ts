import { Injectable, NotFoundException } from '@nestjs/common';

import { ChannelTypeEnum } from '@novu/stateless';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';

import { ChatOauthCommand } from './chat-oauth.command';

@Injectable()
export class ChatOauth {
  readonly SLACK_OAUTH_URL = 'https://slack.com/oauth/v2/authorize?';

  constructor(private integrationRepository: IntegrationRepository) {}
  async execute(command: ChatOauthCommand): Promise<string> {
    const clientId = await this.getClientId(command);

    return this.getOAuthUrl(command.subscriberId, command.environmentId, clientId);
  }

  private getOAuthUrl(subscriberId: string, environmentId: string, clientId: string): string {
    const redirectUri = `${process.env.API_ROOT_URL}/v1/subscribers/${subscriberId}/credentials/slack/${environmentId}/callback`;

    return `${this.SLACK_OAUTH_URL}client_id=${clientId}&scope=incoming-webhook&user_scope=&redirect_uri=${redirectUri}`;
  }

  private async getClientId(command: ChatOauthCommand): Promise<string> {
    const query: Partial<IntegrationEntity> & { _environmentId: string } = {
      _environmentId: command.environmentId,
      channel: ChannelTypeEnum.CHAT,
      providerId: command.providerId,
    };

    const integration = await this.integrationRepository.findOne(query);

    if (integration == null) {
      throw new NotFoundException(
        `Integration in environment ${command.environmentId} was not found, channel: ${ChannelTypeEnum.CHAT}, ` +
          `providerId: ${command.providerId}`
      );
    }

    if (integration.credentials.clientId == null) {
      throw new NotFoundException(
        `Integration in environment ${command.environmentId} missing clientId, channel: ${ChannelTypeEnum.CHAT}, ` +
          `providerId: ${command.providerId}`
      );
    }

    return integration.credentials.clientId;
  }
}
