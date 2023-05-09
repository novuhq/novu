import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';

import { CreateSubscriber, CreateSubscriberCommand, decryptCredentials } from '@novu/application-generic';
import { ICredentialsDto } from '@novu/shared';
import { ChannelTypeEnum, EnvironmentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';

import { ChatOauthCallbackCommand } from './chat-oauth-callback.command';
import {
  IChannelCredentialsCommand,
  UpdateSubscriberChannel,
  UpdateSubscriberChannelCommand,
} from '../update-subscriber-channel';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { OAuthHandlerEnum } from '../../types';

@Injectable()
export class ChatOauthCallback {
  readonly SLACK_ACCESS_URL = 'https://slack.com/api/oauth.v2.access';
  readonly SCRIPT_CLOSE_TAB = '<script>window.close();</script>';

  constructor(
    private updateSubscriberChannelUsecase: UpdateSubscriberChannel,
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private createSubscriberUsecase: CreateSubscriber
  ) {}

  async execute(command: ChatOauthCallbackCommand) {
    const integrationCredentials = await this.getIntegrationCredentials(command);

    const organizationId = await this.getOrganizationId(command.environmentId);

    const webhookUrl = await this.getWebhook(command, integrationCredentials);

    await this.createSubscriber(organizationId, command, webhookUrl);

    const redirect = integrationCredentials.redirectUrl != null && integrationCredentials.redirectUrl != '';

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { redirect, action: redirect ? integrationCredentials.redirectUrl! : this.SCRIPT_CLOSE_TAB };
  }

  private async createSubscriber(
    organizationId: string,
    command: ChatOauthCallbackCommand,
    webhookUrl: string
  ): Promise<void> {
    await this.createSubscriberUsecase.execute(
      CreateSubscriberCommand.create({
        organizationId: organizationId,
        environmentId: command.environmentId,
        subscriberId: command?.subscriberId,
      })
    );

    const subscriberCredentials: IChannelCredentialsCommand = { webhookUrl: webhookUrl, channel: command.providerId };

    await this.updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        providerId: command.providerId,
        credentials: subscriberCredentials,
        oauthHandler: OAuthHandlerEnum.NOVU,
      })
    );
  }

  private async getOrganizationId(environmentId: string): Promise<string> {
    const environment = await this.environmentRepository.findById(environmentId);

    if (environment == null) {
      throw new NotFoundException(`Environment ID: ${environmentId} not found`);
    }

    return environment._organizationId;
  }

  private async getWebhook(
    command: ChatOauthCallbackCommand,
    integrationCredentials: ICredentialsDto
  ): Promise<string> {
    const redirectUri =
      process.env.API_ROOT_URL +
      `/v1/subscribers/${command.subscriberId}/credentials/${command.providerId}/${command.environmentId}/callback`;

    const body = {
      redirect_uri: redirectUri,
      code: command.providerCode,
      client_id: integrationCredentials.clientId,
      client_secret: integrationCredentials.secretKey,
    };
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const res = await axios.post(this.SLACK_ACCESS_URL, body, config);
    const webhook = res.data?.incoming_webhook?.url;

    if (res?.data?.ok === false) {
      const metaData = res?.data?.response_metadata?.messages?.join(', ');
      throw new ApiException(
        `Provider ${command.providerId} returned error ${res.data.error}${metaData ? ', metadata:' + metaData : ''}`
      );
    }

    return webhook;
  }

  private async getIntegrationCredentials(command: ChatOauthCallbackCommand) {
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

    integration.credentials = decryptCredentials(integration.credentials);

    return integration.credentials;
  }
}
